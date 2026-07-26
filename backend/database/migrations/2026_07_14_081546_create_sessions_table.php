<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('sessions', function (Blueprint $table) {
            $table->increments('sessionId'); // auto-increment PK
            $table->unsignedInteger('coachId');
            $table->unsignedInteger('roomId');
            $table->unsignedInteger('level');
            $table->date('date');
            $table->time('startTime');
            $table->time('endTime');
            $table->integer('places');

            $table->foreign('coachId')
                  ->references('coachId')
                  ->on('coaches')
                  ->onDelete('restrict');

            $table->foreign('roomId')
                  ->references('roomId')
                  ->on('rooms')
                  ->onDelete('restrict');
        });
    }

    public function down()
    {
        Schema::dropIfExists('sessions');
    }
};
