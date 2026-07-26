<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('persons', function (Blueprint $table) {
            $table->increments('personId'); // auto-increment primary key
            $table->string('firstName', 50);
            $table->string('lastName', 50);
            $table->date('birthDate')->nullable();
            $table->string('email', 255)->unique();
            $table->string('password', 255);
        });
    }

    public function down()
    {
        Schema::dropIfExists('persons');
    }
};

?>