<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    public $timestamps = false;

    protected $table = 'rooms';
    protected $primaryKey = 'roomId';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'number',
        'capacity',
        'isAvailable',
    ];
}
