<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Reservation;

class ReservationController extends Controller
{
    public function index()
    {
        return Reservation::all();
    }

    public function store(Request $request)
    {
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
}
