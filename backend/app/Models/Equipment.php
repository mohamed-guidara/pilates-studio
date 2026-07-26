<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Equipment extends Model
{
    public $timestamps = false;

    protected $table = 'equipments';
    protected $primaryKey = 'equipmentId';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'roomId',
        'name',
        'description',
        'isAvailable',
    ];

    // Relationship: each equipment belongs to a room
    public function room()
    {
        return $this->belongsTo(Room::class, 'roomId', 'roomId');
    }
}
