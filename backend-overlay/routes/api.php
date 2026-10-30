<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StudyTaskController;
use App\Http\Controllers\Api\StudySubjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:8,1');
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});
Route::middleware('auth:sanctum')->group(function (): void {
    Route::apiResource('tasks', StudyTaskController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/subjects', [StudySubjectController::class, 'index']);
    Route::post('/subjects', [StudySubjectController::class, 'store']);
    Route::delete('/subjects/{subject}', [StudySubjectController::class, 'destroy']);
});