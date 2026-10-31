<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('study_tasks', 'estimated_minutes')) {
            Schema::table('study_tasks', function (Blueprint $table): void {
                $table->unsignedSmallInteger('estimated_minutes')->default(30)->after('scheduled_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('study_tasks', 'estimated_minutes')) {
            Schema::table('study_tasks', function (Blueprint $table): void {
                $table->dropColumn('estimated_minutes');
            });
        }
    }
};
