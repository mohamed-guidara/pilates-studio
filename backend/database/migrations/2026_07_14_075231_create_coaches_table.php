<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('coaches', function (Blueprint $table) {
            $table->increments('coachId'); // auto-increment PK
            $table->unsignedInteger('personId')->unique(); // FK to persons, unique
            $table->boolean('isAdmin')->default(false);

            $table->foreign('personId')
                  ->references('personId')
                  ->on('persons')
                  ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('coaches');
    }
};
