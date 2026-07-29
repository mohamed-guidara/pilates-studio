<?php

namespace App\Rules;

class PersonRules
{
  public static function rules($personId = null)
  {
    return [
      'firstName' => 'required|string|max:255',
      'lastName'  => 'required|string|max:255',
      'birthDate' => 'required|date',
      //email is unique unless it's the same user updating his data
      'email'     => 'required|email|unique:persons,email,' . $personId . ',personId',
      //on create password is required
      //on update, password is optional (keep the old)
      'password'  => $personId
        ? 'nullable|string'
        : 'required|string',
    ];
  }
}
