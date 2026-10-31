<?php

namespace Tests\Feature;

use App\Models\StudyTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudyTaskApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_list_tasks(): void
    {
        $this->getJson('/api/tasks')->assertUnauthorized();
    }

    public function test_user_can_create_and_complete_a_task(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/tasks', [
            'title' => 'Revise linked lists',
            'subject' => 'Data Structures',
            'estimated_minutes' => 30,
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Revise linked lists')
            ->assertJsonPath('data.estimated_minutes', 30)
            ->assertJsonPath('data.is_completed', false);

        $task = StudyTask::query()->where('user_id', $user->id)->firstOrFail();
        $this->patchJson('/api/tasks/'.$task->id, ['estimated_minutes' => 45])
            ->assertOk()
            ->assertJsonPath('data.estimated_minutes', 45);
        $this->patchJson('/api/tasks/'.$task->id, ['is_completed' => true])
            ->assertOk()
            ->assertJsonPath('data.is_completed', true);
    }

    public function test_user_cannot_update_another_users_task(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $task = $owner->studyTasks()->create(['title' => 'Private task']);
        Sanctum::actingAs($other);

        $this->patchJson('/api/tasks/'.$task->id, ['title' => 'Changed'])
            ->assertNotFound();
    }

    public function test_task_list_is_scoped_to_current_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $user->studyTasks()->create(['title' => 'My task']);
        $other->studyTasks()->create(['title' => 'Their task']);
        Sanctum::actingAs($user);

        $this->getJson('/api/tasks')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'My task');
    }

    public function test_task_planning_fields_are_saved_and_recurring_tasks_create_next_occurrence(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $scheduledAt = now()->addDay()->startOfMinute();

        $this->postJson('/api/tasks', [
            'title' => 'Practice calculus',
            'subject' => 'Math',
            'scheduled_at' => $scheduledAt->toIso8601String(),
            'priority' => 'high',
            'notes' => 'Review the derivatives worksheet.',
            'recurrence' => 'weekly',
            'reminder_minutes_before' => 15,
        ])
            ->assertCreated()
            ->assertJsonPath('data.priority', 'high')
            ->assertJsonPath('data.notes', 'Review the derivatives worksheet.')
            ->assertJsonPath('data.recurrence', 'weekly')
            ->assertJsonPath('data.reminder_minutes_before', 15);

        $task = StudyTask::query()->where('user_id', $user->id)->firstOrFail();
        $this->patchJson('/api/tasks/'.$task->id, ['is_completed' => true])->assertOk();
        $nextTask = StudyTask::query()
            ->where('recurrence_generated_from_id', $task->id)
            ->firstOrFail();

        $this->assertSame(
            $scheduledAt->copy()->addWeek()->toDateTimeString(),
            $nextTask->scheduled_at->toDateTimeString()
        );
        $this->assertSame('high', $nextTask->priority);
        $this->assertSame('Review the derivatives worksheet.', $nextTask->notes);

        $this->patchJson('/api/tasks/'.$task->id, ['is_completed' => false])->assertOk();
        $this->patchJson('/api/tasks/'.$task->id, ['is_completed' => true])->assertOk();
        $this->assertSame(2, StudyTask::query()->where('user_id', $user->id)->count());
    }

    public function test_recurring_tasks_require_a_schedule(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/tasks', [
            'title' => 'Daily review',
            'recurrence' => 'daily',
        ])->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');
    }

    public function test_user_can_update_daily_goal_and_save_focus_session(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->patchJson('/api/study-settings', ['daily_goal_minutes' => 90])
            ->assertOk()
            ->assertJsonPath('user.daily_goal_minutes', 90);

        $this->postJson('/api/focus-sessions', [
            'duration_minutes' => 25,
            'subject' => 'Math',
        ])
            ->assertCreated()
            ->assertJsonPath('data.duration_minutes', 25)
            ->assertJsonPath('data.subject', 'Math');

        $this->getJson('/api/focus-sessions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.duration_minutes', 25);
    }
}