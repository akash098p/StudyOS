<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudySubject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudySubjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->studySubjects()->orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('study_subjects', 'name')->where('user_id', $request->user()->id)],
        ]);
        $subject = $request->user()->studySubjects()->create(['name' => trim($data['name'])]);
        return response()->json(['data' => $subject], 201);
    }

    public function destroy(Request $request, StudySubject $subject): JsonResponse
    {
        abort_unless($subject->user_id === $request->user()->id, 404);
        $subject->delete();
        return response()->json([], 204);
    }
}
