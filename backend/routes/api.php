<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PersonController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\CoachController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\WaitingController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;


Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);


Route::middleware('auth:sanctum')->group(function () {
    // Admin routes
    Route::middleware('abilities:admin')->group(function () {
        Route::apiResource('clients', ClientController::class);
        Route::apiResource('coaches', CoachController::class);
        Route::apiResource('rooms', RoomController::class);
        Route::apiResource('equipments', EquipmentController::class);
        Route::apiResource('sessions', SessionController::class);
        Route::apiResource('payments', PaymentController::class)->only([
            'index', 'store', 'show'
            ]);
    });
    // Coach routes
    Route::middleware('abilities:coach')->group(function () {
        Route::apiResource('clients', ClientController::class)->only([
            'index', 'show', 'update']);

            Route::apiResource('sessions', SessionController::class)->only([
            'index', 'show']);
    });

    // Client routes
    Route::middleware('abilities:client')->group(function () {
        Route::apiResource('reservations', ReservationController::class);
        Route::apiResource('waitings', WaitingController::class);

        Route::apiResource('payments', PaymentController::class)->only([
            'index', 'store', 'show'
            ]);

        Route::apiResource('notifications', NotificationController::class)->only([
            'index', 'store', 'show'
            ]);

    });
})

?>