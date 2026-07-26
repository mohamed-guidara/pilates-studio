<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    public $timestamps = false;

    protected $table = 'reservations';
    protected $primaryKey = 'reservationId';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'sessionId',
        'clientId',
        'status',
    ];

    // Relationships
    public function session()
    {
        return $this->belongsTo(Session::class, 'sessionId', 'sessionId');
    }

    public function client()
    {
        return $this->belongsTo(Person::class, 'clientId', 'personId');
    }
}
