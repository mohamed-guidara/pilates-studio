<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    public $timestamps = false;

    protected $table = 'notifications';
    protected $primaryKey = 'notificationId';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'clientId',
        'subject',
        'content',
        'createdAt',
        'isSeen'
    ];

    // Fixed: clientId here refers to Client.clientId (same convention as
    // Reservation.clientId / Waiting.clientId), not Person.personId directly.
    // The previous version pointed straight at Person using the wrong key.
    public function client()
    {
        return $this->belongsTo(Client::class, 'clientId', 'clientId');
    }
}
