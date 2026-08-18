<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('waitings', function (Blueprint $table) {
            $table->unsignedInteger('sessionId')->nullable()->after('reservationId');
            $table->foreign('sessionId')
                ->references('sessionId')
                ->on('sessions')
                ->onDelete('restrict');
        });

        DB::statement('UPDATE waitings w
            INNER JOIN reservations r ON r.reservationId = w.reservationId
            SET w.sessionId = r.sessionId
            WHERE w.sessionId IS NULL');

        Schema::table('waitings', function (Blueprint $table) {
            $table->unsignedInteger('sessionId')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('waitings', function (Blueprint $table) {
            $table->dropForeign(['sessionId']);
            $table->dropColumn('sessionId');
        });
    }
};
