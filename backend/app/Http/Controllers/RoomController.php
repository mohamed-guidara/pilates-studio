<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Room;

class RoomController extends Controller
{
    public function index()
    {
        return Room::all();
    }

    public function store(Request $request)
    {
        return Room::create($request->all());
    }

    public function show(string $id)
    {
        if (Room::where('roomId', $id)->exists()) {
            return Room::find($id);
        } else {
            return response()->json([
                "message" => "Room not found"
            ], 404);
        }
    }

    public function update(Request $request, string $id)
    {
        if (Room::where('roomId', $id)->exists()) {
            $room = Room::find($id);
            $room->number      = $request->number;
            $room->capacity    = $request->capacity;
            $room->isAvailable = $request->isAvailable;
            $room->save();

            return response()->json([
                "message" => "record updated successfully"
            ], 200);
        } else {
            return response()->json([
                "message" => "Room not found"
            ], 404);
        }
    }

    public function destroy(string $id)
    {
        if (Room::where('roomId', $id)->exists()) {
            $room = Room::find($id);
            $room->delete();

            return response()->json([
                "message" => "record deleted"
            ], 202);
        } else {
            return response()->json([
                "message" => "Room not found"
            ], 404);
        }
    }
}
