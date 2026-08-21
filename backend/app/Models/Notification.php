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

    // Relationship: each notification belongs to a person (client)
    public function client()
    {
        return $this->belongsTo(Client::class, 'clientId', 'clientId');
    }
}
