# StudyOS

A polished student productivity workspace built with React, TypeScript, Vite, Laravel 12, Sanctum and MySQL.

> The repository was empty at project start. This implementation establishes the first working source tree while keeping the dashboard's lavender visual direction.

## Stack

- Frontend: React 18, TypeScript, Vite, Lucide React
- API: Laravel 12, PHP 8.2+
- Authentication: Laravel Sanctum personal access tokens
- Database: MySQL
- Tests: Laravel feature tests + frontend production build

## Features in this foundation

- Responsive dashboard UI
- Registration, login, logout and current-user endpoint
- Protected task CRUD API with per-user authorization
- MySQL migrations and environment template
- Frontend API client and authenticated task persistence
- GitHub Actions checks for frontend build and backend tests

## Quick start

See SETUP.md for complete local Windows instructions.

## Security notes

Never commit environment files, access tokens, API keys, or production credentials. The frontend stores the development bearer token in session storage; use HTTPS and review token lifecycle before public deployment.

## Project status

This is the initial full-stack foundation. The focus timer and several dashboard analytics remain UI-level MVP features; do not treat illustrative dashboard metrics as real analytics yet.
