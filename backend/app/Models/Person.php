<?php
namespace App\Models;


use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Person extends Authenticatable
{
    use HasApiTokens;
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

        public function coach()
    {
        return $this->hasOne(Coach::class, 'personID', 'personId');
    }

    public function client()
    {
        return $this->hasOne(Client::class, 'personID', 'personId');
    }
}

?>