<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('study_tasks', function (Blueprint $table): void {
            $table->string('priority', 10)->default('medium');
            $table->text('notes')->nullable();
            $table->string('recurrence', 10)->default('none');
            $table->unsignedTinyInteger('reminder_minutes_before')->default(0);
            $table->foreignId('recurrence_generated_from_id')
                ->nullable()
                ->unique()
                ->constrained('study_tasks')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('study_tasks', function (Blueprint $table): void {
            $table->dropForeign(['recurrence_generated_from_id']);
            $table->dropUnique(['recurrence_generated_from_id']);
            $table->dropColumn([
                'priority',
                'notes',
                'recurrence',
                'reminder_minutes_before',
                'recurrence_generated_from_id',
            ]);
        });
    }
};
