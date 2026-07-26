<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Waiting extends Model
{
    public $timestamps = false;

    protected $table = 'waitings';
    protected $primaryKey = 'waitingId';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'reservationId',
        'clientId',
        'status',
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
