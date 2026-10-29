<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_an_api_token(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Study Student',
            'email' => 'student@example.com',
            'password' => 'safe-password-123',
            'password_confirmation' => 'safe-password-123',
        ])->assertCreated()->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token']);

        $this->assertDatabaseHas('users', ['email' => 'student@example.com']);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create(['email' => 'student@example.com', 'password' => bcrypt('safe-password-123')]);

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'safe-password-123'])
            ->assertOk()->assertJsonStructure(['user' => ['id', 'email'], 'token']);
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'missing@example.com', 'password' => 'wrong-password'])
            ->assertUnprocessable();
    }
}