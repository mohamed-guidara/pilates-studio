<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Person;
use App\Rules\PersonRules;

class AuthController extends Controller
{

    public function register(Request $request)
    {
        //only clients register

        $validated = $request->validate(PersonRules::rules());
        $validated['password'] = Hash::make($validated['password']);
        $person = Person::create($validated);

        Client::create([
            'personId' => $person->personId,
            'level'    => 1, // default level, adjust as needed
        ]);

        $token = $person->createToken('api-token', ['client'])->plainTextToken;
        return response()->json([
            'message' => 'Client registered successfully',
            'person'  => $person,
            'token'   => $token,
            'role'    => 'client'
            ], 201);

    }

    public function login(Request $request)
    {
        $person = Person::where('email', $request->email)->first();

        if (! $person || ! Hash::check($request->password, $person->password)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        // Collect roles
        if ($person->coach) {
            $role = $person->coach->isAdmin ? 'admin': 'coach';
            } else{
                $role = 'client';
                }
        $token = $person->createToken('api-token')->plainTextToken;


        return response()->json([
            'token' => $token,
            'role' => $role,
            'person' => $person
        ]);
    }

}

?>