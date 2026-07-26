<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Session extends Model
{
    public $timestamps = false;

    protected $table = 'sessions';
    protected $primaryKey = 'sessionId';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'coachId',
        'roomId',
        'level',
        'date',
        'startTime',
        'endTime',
        'places',
    ];

    // Relationships
    public function coach()
    {
        return $this->belongsTo(Coach::class, 'coachId', 'coachId');
    }

    public function room()
    {
        return $this->belongsTo(Room::class, 'roomId', 'roomId');
    }
}
