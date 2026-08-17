<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up()
{
    Schema::table('waitings', function (Blueprint $table) {
        $table->unsignedInteger('reservationId')->nullable()->change();
    });
}

public function down()
{
    Schema::table('waitings', function (Blueprint $table) {
        $table->unsignedInteger('reservationId')->nullable(false)->change();
    });
}

};
