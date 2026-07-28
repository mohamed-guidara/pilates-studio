<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Person;

class AuthController extends Controller
{

    public function register(Request $request)
    {
        $request->validate([
            
        ])
    }

    public function login(Request $request)
    {
        $person = Person::where('email', $request->email)->first();

        if (! $person || ! Hash::check($request->password, $person->password)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        $token = $person->createToken('api-token')->plainTextToken;

        // Collect roles
        $role = '';
        if ($person->client) {
            $role = 'client';
        }
        if ($person->coach) {
            $role = $person->coach->isAdmin ? 'admin' : 'coach';
        }

        return response()->json([
            'token' => $token,
            'role' => $role
        ]);
    }

}

?>