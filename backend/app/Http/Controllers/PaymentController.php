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
        return Payment::find($id);
    }
}
