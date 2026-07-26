<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('equipments', function (Blueprint $table) {
            $table->increments('equipmentId'); // auto-increment PK
            $table->unsignedInteger('roomId'); // FK to rooms
            $table->string('name', 100);
            $table->string('description', 500)->nullable();
            $table->boolean('isAvailable')->default(true);

            $table->foreign('roomId')
                  ->references('roomId')
                  ->on('rooms')
                  ->onDelete('restrict');
        });
    }

    public function down()
    {
        Schema::dropIfExists('equipments');
    }
};
