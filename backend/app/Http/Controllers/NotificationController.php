<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Notification;
use App\Mail\NotificationMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function index()
    {
        return Notification::all();
    }

    public function store(Request $request)
    {
        $notification = Notification::create($request->all());

        $this->sendNotificationEmail($notification);

        return $notification;
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

    /**
     * Sends the notification's subject/content as an email to the client behind it.
     * Deliberately never throws back to the caller — a client not having a resolvable
     * email address, or the mail server being unreachable, should not block the
     * notification itself from being created and returned to the frontend.
     */
    private function sendNotificationEmail(Notification $notification): void
    {
        try {
            $email = $notification->client?->person?->email;

            if (!$email) {
                Log::warning("Notification {$notification->notificationId}: no email found for clientId {$notification->clientId}");
                return;
            }

            Mail::to($email)->send(new NotificationMail($notification));
        } catch (\Throwable $e) {
            Log::error("Failed to send email for notification {$notification->notificationId}: " . $e->getMessage());
        }
    }
}