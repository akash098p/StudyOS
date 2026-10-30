<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudyTask extends Model
{
    use HasFactory;
    protected $fillable = ['title', 'subject', 'scheduled_at', 'estimated_minutes', 'is_completed'];
    protected function casts(): array { return ['scheduled_at' => 'datetime', 'is_completed' => 'boolean']; }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}