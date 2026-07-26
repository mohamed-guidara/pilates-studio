<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->increments('clientId'); // auto-increment PK
            $table->unsignedInteger('personId'); // FK to persons
            $table->integer('level');

            $table->foreign('personId')
                ->references('personId')
                ->on('persons')
                ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('clients');
    }
};
