<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Notification;

class NotificationController extends Controller
{
    public function index()
    {
        return Notification::all();
    }

    public function store(Request $request)
    {
        return Notification::create($request->all());
    }

    public function show(string $id)
    {
        if (Notification::where('notificationId', $id)->exists()) {
            return Notification::find($id);
        } else {
            return response()->json([
                "message" => "Notification not found"
            ], 404);
        }
    }
        public function update(Request $request, string $id)
    {
        if (Notification::where('notificationId', $id)->exists()) {
            $Notification = Notification::find($id);
            $Notification->isSeen      = $request->isSeen;
            $Notification->save();

            return response()->json([
                "message" => "record updated successfully"
            ], 200);
        } else {
            return response()->json([
                "message" => "Notification not found"
            ], 404);
        }
    }
}
