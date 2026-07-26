<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('waitings', function (Blueprint $table) {
            $table->increments('waitingId'); // auto-increment PK
            $table->unsignedInteger('reservationId');
            $table->unsignedInteger('clientId');
            $table->timestamp('createdAt')->useCurrent();
            $table->integer('status');

            $table->foreign('reservationId')
                  ->references('reservationId')
                  ->on('reservations')
                  ->onDelete('restrict');

            $table->foreign('clientId')
                  ->references('clientId')
                  ->on('clients')
                  ->onDelete('restrict');
        });
    }

    public function down()
    {
        Schema::dropIfExists('waitings');
    }
};
