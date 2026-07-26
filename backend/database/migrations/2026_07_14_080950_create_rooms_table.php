<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->increments('roomId'); // auto-increment PK
            $table->string('number', 20)->unique();
            $table->integer('capacity')->check('capacity > 0');
            $table->boolean('isAvailable')->default(true);
        });
    }

    public function down()
    {
        Schema::dropIfExists('rooms');
    }
};
