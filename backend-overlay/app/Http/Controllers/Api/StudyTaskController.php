<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudyTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        ]);
        return response()->json(['data' => $request->user()->studyTasks()->create($data)], 201);
    }

    public function update(Request $request, StudyTask $task): JsonResponse
    {
        abort_unless($task->user_id === $request->user()->id, 404);
        $task->update($request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:180'],
            'subject' => ['sometimes', 'nullable', 'string', 'max:100'],
            'scheduled_at' => ['sometimes', 'nullable', 'date'],
            'estimated_minutes' => ['sometimes', 'integer', 'min:1', 'max:1440'],
            'is_completed' => ['sometimes', 'boolean'],
        ]));
        return response()->json(['data' => $task->refresh()]);
    }

    public function destroy(Request $request, StudyTask $task): JsonResponse
    {
        abort_unless($task->user_id === $request->user()->id, 404);
        $task->delete();
        return response()->json([], 204);
    }
}