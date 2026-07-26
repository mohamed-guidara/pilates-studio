<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    public $timestamps = false;

    protected $table = 'payments';
    protected $primaryKey = 'paymentId';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'reservationId',
        'clientId',
        'amount',
    ];

    // Relationships
    public function reservation()
    {
        return $this->belongsTo(Reservation::class, 'reservationId', 'reservationId');
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'clientId', 'clientId');
    }
}
