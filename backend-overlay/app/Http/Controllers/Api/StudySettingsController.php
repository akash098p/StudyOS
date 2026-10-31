<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudySettingsController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'daily_goal_minutes' => ['required', 'integer', 'min:15', 'max:1440'],
        ]);
        $user = $request->user();
        $user->update($data);

        return response()->json(['user' => $user->refresh()]);
    }
}
