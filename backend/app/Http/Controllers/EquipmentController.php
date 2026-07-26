<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Equipment;

class EquipmentController extends Controller
{
    public function index()
    {
        return Equipment::all();
    }

    public function store(Request $request)
    {
        return Equipment::create($request->all());
    }

    public function show(string $id)
    {
        return Equipment::find($id);
    }

    public function update(Request $request, string $id)
    {
        if (Equipment::where('equipmentId', $id)->exists()) {
            $equipment = Equipment::find($id);
            $equipment->roomId      = $request->roomId;
            $equipment->name        = $request->name;
            $equipment->description = $request->description;
            $equipment->isAvailable = $request->isAvailable;
            $equipment->save();

            return response()->json([
                "message" => "record updated successfully"
            ], 200);
        } else {
            return response()->json([
                "message" => "Equipment not found"
            ], 404);
        }
    }

    public function destroy(string $id)
    {
        if (Equipment::where('equipmentId', $id)->exists()) {
            $equipment = Equipment::find($id);
            $equipment->delete();

            return response()->json([
                "message" => "record deleted"
            ], 202);
        } else {
            return response()->json([
                "message" => "Equipment not found"
            ], 404);
        }
    }
}
