<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coach extends Model
{
    public $timestamps = false;

    protected $table = 'coaches';
    protected $primaryKey = 'coachId';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'personId',
        'isAdmin',
    ];

    // Relationship: each coach belongs to a person
    public function person()
    {
        return $this->belongsTo(Person::class, 'personId', 'personId');
    }
}
