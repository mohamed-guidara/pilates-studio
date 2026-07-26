<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->increments('reservationId'); // auto-increment PK
            $table->unsignedInteger('sessionId');
            $table->unsignedInteger('clientId');
            $table->timestamp('createdAt')->useCurrent();
            $table->integer('status');

            $table->foreign('sessionId')
                  ->references('sessionId')
                  ->on('sessions')
                  ->onDelete('restrict');

            $table->foreign('clientId')
                  ->references('personId')
                  ->on('persons')
                  ->onDelete('restrict');
        });
    }

    public function down()
    {
        Schema::dropIfExists('reservations');
    }
};
