<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Reservation;
use App\Models\Session;
use Carbon\Carbon;

class ReservationController extends Controller
{
    public function index()
    {
        return Reservation::all();
    }

    public function store(Request $request)
    {
        $session = Session::find($request->sessionId);

        if ($session && $this->isBookingClosed($session)) {
            return response()->json([
                'message' => 'Bookings for this session are closed — it starts within 2 hours (or has already started).'
            ], 422);
        }

        return Reservation::create($request->all());
    }

    public function show(string $id)
    {
        if (Reservation::where('reservationId', $id)->exists()) {
            return Reservation::find($id);
        } else {
            return response()->json([
                "message" => "Reservation not found"
            ], 404);
        }
    }

    public function update(Request $request, string $id)
    {
        if (Reservation::where('reservationId', $id)->exists()) {
            $reservation = Reservation::find($id);

            // Guard: don't let a cancelled reservation, or a pending one whose 20-minute
            // payment window has already passed, be resurrected into "confirmed" —
            // whether that comes from a stale frontend tab that hasn't refreshed, or a
            // direct API call. This is the real boundary; the frontend countdown is only
            // a UX hint and was never enough on its own.
            if ((string) $request->status === '2') {
                if ($reservation->status === 3) {
                    return response()->json([
                        'message' => 'This reservation was cancelled and can no longer be confirmed.'
                    ], 422);
                }
                if ($reservation->status === 1 && $this->isPendingReservationExpired($reservation)) {
                    return response()->json([
                        'message' => 'This reservation has expired and can no longer be paid.'
                    ], 422);
                }
            }

            $reservation->sessionId = $request->sessionId;
            $reservation->clientId  = $request->clientId;
            $reservation->status    = $request->status;
            $reservation->save();

            return response()->json([
                "message" => "record updated successfully"
            ], 200);
        } else {
            return response()->json([
                "message" => "Reservation not found"
            ], 404);
        }
    }

    public function destroy(string $id)
    {
        if (Reservation::where('reservationId', $id)->exists()) {
            $reservation = Reservation::find($id);
            $reservation->delete();

            return response()->json([
                "message" => "record deleted"
            ], 202);
        } else {
            return response()->json([
                "message" => "Reservation not found"
            ], 404);
        }
    }

    /**
     * True once we're within 2 hours of the session's start (or it's already
     * started/passed). Only guards manual client bookings — the lifecycle command
     * creates promotion reservations directly via Eloquent, bypassing this route
     * entirely, so waiting-list promotion is never blocked by this check.
     */
    /**
     * True once we're within the configured booking-cutoff window of the session's
     * start (or it's already started/passed). Only guards manual client bookings —
     * the lifecycle command creates promotion reservations directly via Eloquent,
     * bypassing this route entirely, so waiting-list promotion is never blocked by
     * this check.
     */
    private function isBookingClosed(Session $session): bool
    {
        try {
            $startsAt = Carbon::parse("{$session->date} {$session->startTime}");
        } catch (\Throwable $e) {
            return false;
        }

        $cutoffHours = (int) config('booking.booking_cutoff_hours', 2);
        return now()->gte($startsAt->copy()->subHours($cutoffHours));
    }

    /** True once a status-1 reservation is older than the configured expiry window —
     *  the exact same value (config('booking.reservation_expiry_minutes')) the
     *  lifecycle command uses to expire it. Checked here too so a slow cron (or a
     *  stale frontend tab that hasn't refreshed) can never pay for a reservation
     *  that's already effectively expired. */
    private function isPendingReservationExpired(Reservation $reservation): bool
    {
        $expiryMinutes = (int) config('booking.reservation_expiry_minutes', 20);
        return Carbon::parse($reservation->createdAt)->addMinutes($expiryMinutes)->isPast();
    }
}