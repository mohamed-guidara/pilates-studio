<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Waiting;

class WaitingController extends Controller
{
    public function index()
    {
        return Waiting::all();
    }

    public function store(Request $request)
    {
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
}
