<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudyTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'subject',
        'scheduled_at',
        'estimated_minutes',
        'is_completed',
        'priority',
        'notes',
        'recurrence',
        'reminder_minutes_before',
        'recurrence_generated_from_id',
    ];

    protected $hidden = ['recurrence_generated_from_id'];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'estimated_minutes' => 'integer',
            'is_completed' => 'boolean',
            'reminder_minutes_before' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}