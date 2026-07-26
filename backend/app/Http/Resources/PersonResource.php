<?php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PersonResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'personId'  => $this->personId,
            'firstName' => $this->firstName,
            'lastName'  => $this->lastName,
            'birthDate' => $this->birthDate,
            'email'     => $this->email,
            // password intentionally excluded
        ];
    }
}

?>