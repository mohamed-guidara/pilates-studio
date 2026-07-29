<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Person;
use Illuminate\Support\Facades\Hash;
use App\Rules\PersonRules;

class PersonController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Person::all();
    }

    protected function rules($personId = null)
    {

    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {

        $validated = $request->validate(PersonRules::rules());

        $validated['password'] = Hash::make($validated['password']);

        $person = Person::create($validated);

        return response()->json([
            'message' => 'Person created successfully',
            'person'  => $person
        ], 201);
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
        $person = Person::find($id);
        if (!$person) {
            return response()->json([
                "message" => "Person not found"
            ], 404);
        }


        $validated = $request->validate(PersonRules::rules($id));

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']); // don’t overwrite with null
        }

        $person->update($validated); // fill + save

        return response()->json([
            "message" => "Record updated successfully",
            "person"  => $person
        ], 200);
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