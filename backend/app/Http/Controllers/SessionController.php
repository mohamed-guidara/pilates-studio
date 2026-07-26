<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Session;

class SessionController extends Controller
{
    public function index()
    {
        return Session::all();
    }

    public function store(Request $request)
    {
        return Session::create($request->all());
    }

    public function show(string $id)
    {
        return Session::find($id);
    }

    public function update(Request $request, string $id)
    {
        if (Session::where('sessionId', $id)->exists()) {
            $session = Session::find($id);
            $session->coachId   = $request->coachId;
            $session->roomId    = $request->roomId;
            $session->level     = $request->level;
            $session->date      = $request->date;
            $session->startTime = $request->startTime;
            $session->endTime   = $request->endTime;
            $session->places    = $request->places;
            $session->save();

            return response()->json([
                "message" => "record updated successfully"
            ], 200);
        } else {
            return response()->json([
                "message" => "Session not found"
            ], 404);
        }
    }

    public function destroy(string $id)
    {
        if (Session::where('sessionId', $id)->exists()) {
            $session = Session::find($id);
            $session->delete();

            return response()->json([
                "message" => "record deleted"
            ], 202);
        } else {
            return response()->json([
                "message" => "Session not found"
            ], 404);
        }
    }
}
