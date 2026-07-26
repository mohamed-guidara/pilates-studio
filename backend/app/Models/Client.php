<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    public $timestamps = false;

    protected $table = 'clients';
    protected $primaryKey = 'clientId';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'personId',
        'level',
    ];

    // Relationship: each client belongs to a person
    public function person()
    {
        return $this->belongsTo(Person::class, 'personId', 'personId');
    }
}
