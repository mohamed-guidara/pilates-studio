<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->increments('notificationId'); // auto-increment PK
            $table->unsignedInteger('clientId');
            $table->string('subject', 255)->nullable();
            $table->string('content', 4000)->nullable();
            $table->timestamp('createdAt')->useCurrent();

            $table->foreign('clientId')
                  ->references('personId')
                  ->on('persons')
                  ->onDelete('restrict');
        });
    }

    public function down()
    {
        Schema::dropIfExists('notifications');
    }
};
