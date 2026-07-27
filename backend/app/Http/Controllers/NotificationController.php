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
}
