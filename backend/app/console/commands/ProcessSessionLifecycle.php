<?php

namespace App\Console\Commands;

use App\Mail\NotificationMail;
use App\Models\Client;
use App\Models\Notification;
use App\Models\Reservation;
use App\Models\Session;
use App\Models\Waiting;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Runs every minute (see routes/console.php). Does three things, each pass wrapped
 * in a locked DB transaction so concurrent runs / overlapping invocations can't
 * double-process the same row:
 *
 *  1. Expires pending reservations (status 1) older than
 *     config('booking.reservation_expiry_minutes') → status 3, freeing the place,
 *     and notifies the client.
 *  2. Promotes waiting-list clients (status 1, oldest first) into any freed
 *     capacity: creates a pending reservation (status 1), links it back onto the
 *     Waiting row (reservationId + status 2), and notifies the client. This runs
 *     regardless of how close the session is to starting — only *manual*
 *     booking/waitlist-join is blocked in the config('booking.booking_cutoff_hours')
 *     window (enforced in ReservationController/WaitingController@store), not this.
 *  3. Sends a one-time "starts soon" reminder to every active (status 1 or 2)
 *     reservation holder, the moment a session enters its cutoff-hours window. Dedup
 *     is a real `reminderSentAt` column on `sessions`, set inside the same locked
 *     transaction as the check — not the localStorage guesswork this replaces.
 *
 * Both timing values live in config/booking.php (overridable via .env:
 * RESERVATION_EXPIRY_MINUTES, BOOKING_CUTOFF_HOURS) — this and ReservationController
 * both read from there now, so there is exactly one place to change either value.
 */
class ProcessSessionLifecycle extends Command
{
    protected $signature = 'sessions:process-lifecycle';
    protected $description = 'Expires stale reservations, promotes waiting-list clients, and sends session reminders.';

    private int $reservationExpiryMinutes;
    private int $bookingCutoffHours;

    public function __construct()
    {
        parent::__construct();
        // Read fresh from config on every run (a new CLI process each time the
        // scheduler fires this), so a .env change takes effect on the very next tick
        // with no restart of schedule:work needed.
        $this->reservationExpiryMinutes = (int) config('booking.reservation_expiry_minutes', 20);
        $this->bookingCutoffHours = (int) config('booking.booking_cutoff_hours', 2);
    }

    public function handle(): int
    {
        $this->expireStaleReservations();
        $this->promoteWaitingLists();
        $this->sendUpcomingSessionReminders();

        return self::SUCCESS;
    }

    private function expireStaleReservations(): void
    {
        $cutoff = now()->subMinutes($this->reservationExpiryMinutes);

        $staleIds = Reservation::where('status', 1)
            ->where('createdAt', '<=', $cutoff)
            ->pluck('reservationId');

        foreach ($staleIds as $reservationId) {
            DB::transaction(function () use ($reservationId) {
                $reservation = Reservation::where('reservationId', $reservationId)->lockForUpdate()->first();

                if (!$reservation || $reservation->status !== 1) {
                    return; // already handled by another run
                }

                $reservation->status = 3;
                $reservation->save();

                $this->notifyClient(
                    $reservation->clientId,
                    'Reservation expired',
                    "your pending reservation for {$this->describeSession($reservation->sessionId)} has expired because payment wasn't completed within {$this->reservationExpiryMinutes} minutes. Your place has been released."
                );
            });
        }
    }

    private function promoteWaitingLists(): void
    {
        $sessionIds = Session::pluck('sessionId');

        foreach ($sessionIds as $sessionId) {
            DB::transaction(function () use ($sessionId) {
                $session = Session::where('sessionId', $sessionId)->lockForUpdate()->first();
                if (!$session) return;

                $occupied = Reservation::where('sessionId', $session->sessionId)
                    ->whereIn('status', [1, 2])
                    ->lockForUpdate()
                    ->count();

                $capacity = $session->places - $occupied;
                if ($capacity <= 0) return;

                $queue = Waiting::where('sessionId', $session->sessionId)
                    ->where('status', 1)
                    ->orderBy('createdAt', 'asc')
                    ->lockForUpdate()
                    ->get();

                foreach ($queue as $waiting) {
                    if ($capacity <= 0) break;

                    $reservation = Reservation::create([
                        'sessionId' => $session->sessionId,
                        'clientId' => $waiting->clientId,
                        'status' => 1,
                    ]);

                    $waiting->reservationId = $reservation->reservationId;
                    $waiting->status = 2;
                    $waiting->save();

                    $this->notifyClient(
                        $waiting->clientId,
                        'A place opened up!',
                        "a place became available for {$this->describeSession($session)} that you were waiting on. Please complete payment within {$this->reservationExpiryMinutes} minutes or your reservation will expire and the place will be released again."
                    );

                    $capacity--;
                }
            });
        }
    }

    private function sendUpcomingSessionReminders(): void
    {
        $now = now();
        $windowEnd = $now->copy()->addHours($this->bookingCutoffHours);

        $candidateIds = Session::whereNull('reminderSentAt')->pluck('sessionId');

        foreach ($candidateIds as $sessionId) {
            DB::transaction(function () use ($sessionId, $now, $windowEnd) {
                $session = Session::where('sessionId', $sessionId)->lockForUpdate()->first();

                if (!$session || $session->reminderSentAt !== null) {
                    return; // already sent by a concurrent run
                }

                $startsAt = $this->sessionStartsAt($session);
                if (!$startsAt || $startsAt->lte($now) || $startsAt->gt($windowEnd)) {
                    return; // not in the reminder window (yet, or ever — already started)
                }

                $attendees = Reservation::where('sessionId', $session->sessionId)
                    ->whereIn('status', [1, 2])
                    ->get();

                foreach ($attendees as $reservation) {
                    $this->notifyClient(
                        $reservation->clientId,
                        'Your session starts soon',
                        "this is a reminder that {$this->describeSession($session)} starts in about {$this->bookingCutoffHours} hours. See you there!"
                    );
                }

                $session->reminderSentAt = now();
                $session->save();
            });
        }
    }

    private function sessionStartsAt(Session $session): ?Carbon
    {
        try {
            return Carbon::parse("{$session->date} {$session->startTime}");
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function describeSession(Session|int $session): string
    {
        if (is_int($session)) {
            $session = Session::find($session);
        }
        if (!$session) {
            return 'your session';
        }

        $date = Carbon::parse($session->date)->format('D, j M');
        $start = substr($session->startTime, 0, 5);
        $end = substr($session->endTime, 0, 5);

        // NOTE: category is rendered as a raw number — swap in the real label once
        // the category → name mapping (used by SessionCategoryPipe on the frontend) is
        // available here too.
        return "the Category #{$session->category} session on {$date} from {$start} to {$end}";
    }

    private function notifyClient(int $clientId, string $subject, string $content): void
    {
        $person = Client::find($clientId)?->person;
        $greeting = $person ? "Hi {$person->firstName}, " : 'Hi, ';

        $notification = Notification::create([
            'clientId' => $clientId,
            'subject' => $subject,
            'content' => $greeting . $content,
            'createdAt' => now(),
            'isSeen' => 0,
        ]);

        try {
            if ($person?->email) {
                Mail::to($person->email)->send(new NotificationMail($notification));
            } else {
                Log::warning("No email found for clientId {$clientId}, notification {$notification->notificationId} not emailed.");
            }
        } catch (\Throwable $e) {
            Log::error("Failed to send email for notification {$notification->notificationId}: " . $e->getMessage());
        }
    }
}