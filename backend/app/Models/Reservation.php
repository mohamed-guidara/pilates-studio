<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

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

    protected static function booted(): void
    {
        static::creating(function (Reservation $reservation): void {
            $reservation->createdAt ??= Carbon::now();
        });
    }

    // Relationships
    public function session()
    {
        return $this->belongsTo(Session::class, 'sessionId', 'sessionId');
    }

    // Fixed: clientId refers to Client.clientId (same convention as Waiting.clientId),
    // not Person.personId directly. The previous version pointed straight at Person
    // using the wrong key, same bug that was in the Notification model.
    public function client()
    {
        return $this->belongsTo(Client::class, 'clientId', 'clientId');
    }
}
