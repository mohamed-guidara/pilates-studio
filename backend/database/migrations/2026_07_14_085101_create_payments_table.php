<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->increments('paymentId'); // auto-increment PK
            $table->unsignedInteger('reservationId');
            $table->unsignedInteger('clientId');
            $table->timestamp('createdAt')->useCurrent();
            $table->decimal('amount', 5, 2);

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
        Schema::dropIfExists('payments');
    }
};
