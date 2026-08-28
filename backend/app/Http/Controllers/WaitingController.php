<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Waiting;
use App\Models\Session;
use Carbon\Carbon;

class WaitingController extends Controller
{
    public function index()
    {
        return Waiting::all();
    }

    public function store(Request $request)
    {
        $session = Session::find($request->sessionId);

        if ($session && $this->isBookingClosed($session)) {
            return response()->json([
                'message' => 'Joining the waiting list is closed — this session starts within 2 hours (or has already started).'
            ], 422);
        }

        return Waiting::create($request->all());
    }

    public function show(string $id)
    {
        if (Waiting::where('waitingId', $id)->exists()) {
            return Waiting::find($id);
        } else {
            return response()->json([
                "message" => "Waiting not found"
            ], 404);
        }
    }

    public function update(Request $request, string $id)
    {
        if (Waiting::where('waitingId', $id)->exists()) {
            $waiting = Waiting::find($id);
            $waiting->sessionId     = $request->sessionId;
            $waiting->reservationId = $request->reservationId;
            $waiting->clientId      = $request->clientId;
            $waiting->status        = $request->status;
            $waiting->save();

            return response()->json([
                "message" => "record updated successfully"
            ], 200);
        } else {
            return response()->json([
                "message" => "Waiting not found"
            ], 404);
        }
    }

    public function destroy(string $id)
    {
        if (Waiting::where('waitingId', $id)->exists()) {
            $waiting = Waiting::find($id);
            $waiting->delete();

            return response()->json([
                "message" => "record deleted"
            ], 202);
        } else {
            return response()->json([
                "message" => "Waiting not found"
            ], 404);
        }
    }

    /**
     * Same booking-cutoff rule as ReservationController — only guards manual joins.
     * The lifecycle command's promotion path creates/updates Waiting rows directly
     * via Eloquent, bypassing this route, so it's never affected by this check.
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
}