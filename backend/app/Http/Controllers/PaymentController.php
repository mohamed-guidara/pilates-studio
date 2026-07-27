<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Payment;

class PaymentController extends Controller
{
    public function index()
    {
        return Payment::all();
    }

    public function store(Request $request)
    {
        return Payment::create($request->all());
    }

    public function show(string $id)
    {
        if (Payment::where('paymentId', $id)->exists()) {
            return Payment::find($id);
        } else {
            return response()->json([
                "message" => "Payment not found"
            ], 404);
        }
    }
}
