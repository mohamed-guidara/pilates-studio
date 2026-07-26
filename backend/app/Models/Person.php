<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Person extends Model
{
    public $timestamps = false;

    protected $table = 'persons';
    protected $primaryKey = 'personId';
    public $incrementing = true;
    protected $keyType = 'int';
    protected $fillable = [
        'firstName',
        'lastName',
        'birthDate',
        'email',
        'password',
    ];

    protected $hidden = ['password'];
}

?>