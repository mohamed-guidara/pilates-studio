<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Coach;

class CoachController extends Controller
{
    public function index()
    {
        return Coach::all();
    }

    public function store(Request $request)
    {
        return Coach::create($request->all());
    }

    public function show(string $id)
    {
        if (Coach::where('coachId', $id)->exists()) {
            return Coach::find($id);
        } else {
            return response()->json([
                "message" => "Coach not found"
            ], 404);
        }
    }

    public function update(Request $request, string $id)
    {
        if (Coach::where('coachId', $id)->exists()) {
            $coach = Coach::find($id);
            $coach->personId = $request->personId;
            $coach->isAdmin  = $request->isAdmin;
            $coach->save();

            return response()->json([
                "message" => "record updated successfully"
            ], 200);
        } else {
            return response()->json([
                "message" => "Coach not found"
            ], 404);
        }
    }

    public function destroy(string $id)
    {
        $coach = Coach::find($id);

        if (!$coach) {
            return response()->json(["message" => "Coach not found"], 404);
        }

        $person = $coach->person; // relationship

        $coach->delete();

        // If person has no coach, delete person too
        if (!$person->client) {
            $person->delete();
        }

        return response()->json([
            "message" => "Coach deleted successfully"], 200);
    }
}
