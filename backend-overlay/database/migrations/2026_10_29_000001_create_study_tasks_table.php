<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('study_tasks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 180);
            $table->string('subject', 100)->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->boolean('is_completed')->default(false);
            $table->timestamps();
            $table->index(['user_id', 'is_completed']);
        });
    }
    public function down(): void { Schema::dropIfExists('study_tasks'); }
};