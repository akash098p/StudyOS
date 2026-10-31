<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FocusSessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->focusSessions()->latest('completed_at')->limit(100)->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'duration_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'subject' => ['nullable', 'string', 'max:100'],
        ]);
        $completedAt = now();
        $session = $request->user()->focusSessions()->create([
            'subject' => $data['subject'] ?? null,
            'duration_minutes' => $data['duration_minutes'],
            'started_at' => $completedAt->copy()->subMinutes($data['duration_minutes']),
            'completed_at' => $completedAt,
        ]);

        return response()->json(['data' => $session], 201);
    }
}
