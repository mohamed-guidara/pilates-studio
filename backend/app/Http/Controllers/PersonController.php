<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Person;

class PersonController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Person::all();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        return Person::create($request->all());
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        if (Person::where('personId', $id)->exists()) {
            return Person::find($id);
        } else {
            return response()->json([
                "message" => "Person not found"
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        if (Person::where('personId', $id)->exists()) {
            $person = Person::find($id);
            $person->firstName = $request->firstName;
            $person->lastName  = $request->lastName;
            $person->birthDate = $request->birthDate;
            $person->email     = $request->email;
            $person->password  = $request->password;

            $person->save();

            return response()->json([
                "message" => "record updated successfully"
            ], 200);
        } else {
            return response()->json([
                "message" => "Person not found"
            ], 404);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        if (Person::where('personId', $id)->exists()) {
            $person = Person::find($id);
            $person->delete();

            return response()->json([
                "message" => "record deleted"
            ], 202);
        } else {
            return response()->json([
                "message" => "Person not found"
            ], 404);
        }
    }
}
?>