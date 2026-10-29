# StudyOS

A calm, responsive student productivity workspace with a lavender visual system.

## Stack
- Frontend: React 18, TypeScript, Vite and Lucide React
- API overlay: Laravel 12 and Sanctum personal access tokens
- Persistence: MySQL
- Checks: GitHub Actions frontend production build; PHPUnit feature tests supplied in backend overlay

## Current features
- Responsive dashboard and task search
- Registration and login UI connected to the API client
- Protected task list, create, completion toggle and delete operations
- Per-user task ownership checks in the API
- MySQL migration for study tasks
- Responsive mobile navigation and accessible form labels

## Quick start
Follow SETUP.md for Windows setup instructions. Laravel's generated framework skeleton and vendor dependencies are intentionally generated locally with Composer; the API source is in backend-overlay/.

## Security
Never commit environment files, credentials, tokens, or production secrets. The current frontend uses a bearer token in session storage as a straightforward development implementation. Before public deployment, use HTTPS, configure token expiry and rate limits, and consider Sanctum's cookie-based SPA authentication for a same-site first-party browser app.

## MVP limitations
Focus timer, subject progress, weekly plan, and the weekly goal card are presentation-only sample UI. They are not persisted analytics yet. The API and database require local Laravel/MySQL setup before authentication and task actions can work.
