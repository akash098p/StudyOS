<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudyTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudyTaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->studyTasks()->latest()->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'subject' => ['nullable', 'string', 'max:100'],
            'scheduled_at' => ['nullable', 'date'],
            'estimated_minutes' => ['sometimes', 'integer', 'min:1', 'max:1440'],
            'is_completed' => ['sometimes', 'boolean'],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'recurrence' => ['sometimes', Rule::in(['none', 'daily', 'weekly'])],
            'reminder_minutes_before' => ['sometimes', Rule::in([0, 5, 10, 15, 30])],
        ]);
        $data['estimated_minutes'] ??= 30;
        $data['is_completed'] ??= false;
        $data['priority'] ??= 'medium';
        $data['notes'] ??= null;
        $data['recurrence'] ??= 'none';
        $data['reminder_minutes_before'] ??= 0;
        $this->ensureRecurringTaskHasSchedule($data['recurrence'], $data['scheduled_at'] ?? null);

        return response()->json(['data' => $request->user()->studyTasks()->create($data)], 201);
    }

    public function update(Request $request, StudyTask $task): JsonResponse
    {
        abort_unless($task->user_id === $request->user()->id, 404);
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:180'],
            'subject' => ['sometimes', 'nullable', 'string', 'max:100'],
            'scheduled_at' => ['sometimes', 'nullable', 'date'],
            'estimated_minutes' => ['sometimes', 'integer', 'min:1', 'max:1440'],
            'is_completed' => ['sometimes', 'boolean'],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'recurrence' => ['sometimes', Rule::in(['none', 'daily', 'weekly'])],
            'reminder_minutes_before' => ['sometimes', Rule::in([0, 5, 10, 15, 30])],
        ]);
        $recurrence = $data['recurrence'] ?? $task->recurrence;
        $scheduledAt = array_key_exists('scheduled_at', $data)
            ? $data['scheduled_at']
            : $task->scheduled_at;
        $this->ensureRecurringTaskHasSchedule($recurrence, $scheduledAt);

        return DB::transaction(function () use ($data, $task): JsonResponse {
            $task = StudyTask::query()->lockForUpdate()->findOrFail($task->id);
            $wasCompleted = $task->is_completed;
            $task->update($data);

            if (
                !$wasCompleted &&
                $task->is_completed &&
                $task->recurrence !== 'none' &&
                $task->scheduled_at
            ) {
                $nextScheduledAt = $task->recurrence === 'daily'
                    ? $task->scheduled_at->copy()->addDay()
                    : $task->scheduled_at->copy()->addWeek();
                while ($nextScheduledAt->lte(now())) {
                    if ($task->recurrence === 'daily') {
                        $nextScheduledAt->addDay();
                    } else {
                        $nextScheduledAt->addWeek();
                    }
                }

                $task->user->studyTasks()->firstOrCreate(
                    ['recurrence_generated_from_id' => $task->id],
                    [
                        'title' => $task->title,
                        'subject' => $task->subject,
                        'scheduled_at' => $nextScheduledAt,
                        'estimated_minutes' => $task->estimated_minutes,
                        'is_completed' => false,
                        'priority' => $task->priority,
                        'notes' => $task->notes,
                        'recurrence' => $task->recurrence,
                        'reminder_minutes_before' => $task->reminder_minutes_before,
                    ]
                );
            }

            return response()->json(['data' => $task->refresh()]);
        });
    }

    public function destroy(Request $request, StudyTask $task): JsonResponse
    {
        abort_unless($task->user_id === $request->user()->id, 404);
        $task->delete();
        return response()->json([], 204);
    }

    private function ensureRecurringTaskHasSchedule(string $recurrence, mixed $scheduledAt): void
    {
        if ($recurrence !== 'none' && !$scheduledAt) {
            throw ValidationException::withMessages([
                'scheduled_at' => ['A scheduled date and time are required for recurring tasks.'],
            ]);
        }
    }
}