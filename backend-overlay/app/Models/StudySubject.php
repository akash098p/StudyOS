<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudySubject extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'name'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(StudyTask::class, 'user_id', 'user_id')->where('subject', $this->name);
    }

    public function completedTasks(): HasMany
    {
        return $this->tasks()->where('is_completed', true);
    }
}
