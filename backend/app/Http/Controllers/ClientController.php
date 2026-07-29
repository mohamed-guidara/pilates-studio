<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Client;

class ClientController extends Controller
{
    public function index()
    {
        return Client::all();
    }

    public function store(Request $request)
    {
        return Client::create($request->all());
    }

    public function show(string $id)
    {
        if (Client::where('clientId', $id)->exists()) {
            return Client::find($id);
        } else {
            return response()->json([
                "message" => "Client not found"
            ], 404);
        }
    }

    public function update(Request $request, string $id)
    {
        if (Client::where('clientId', $id)->exists()) {
            $client = Client::find($id);
            $client->personId = $request->personId;
            $client->level    = $request->level;
            $client->save();

            return response()->json([
                "message" => "record updated successfully"
            ], 200);
        } else {
            return response()->json([
                "message" => "Client not found"
            ], 404);
        }
    }

    public function destroy(string $id)
    {
        $client = Client::find($id);

        if (!$client) {
            return response()->json(["message" => "Client not found"], 404);
        }

        $person = $client->person; // relationship

        $client->delete();

        // If person has no coach, delete person too
        if (!$person->coach) {
            $person->delete();
        }

        return response()->json([
            "message" => "Client deleted successfully"], 200);
    }
}
