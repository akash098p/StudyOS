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
}