# StudyOS

A calm, responsive student productivity workspace with a lavender visual system.

## Stack
- **Frontend:** React 18, TypeScript, Vite and Lucide React (runs on `http://localhost:5173`)
- **API:** Laravel 12 and Sanctum personal access tokens (runs on `http://127.0.0.1:8000`)
- **Persistence:** MySQL
- **CI:** GitHub Actions — frontend production build; PHP syntax checks on `backend-overlay/`

## Project layout
| Path | Purpose |
|------|---------|
| `frontend/` | Vite + React SPA source |
| `backend-overlay/` | Versioned Laravel API source (controllers, models, migrations, routes, tests) |
| `backend/` | Generated locally by the setup script (Laravel skeleton + vendor; **not committed**) |
| `scripts/` | Setup helpers (`setup-full.ps1`, `open-browser.bat`) |
| `.github/workflows/` | CI workflows |

## One-command setup (Windows)

### Requirements
- **Node.js 20+** and `npm`
- **PHP 8.2+** with PDO MySQL support and **Composer 2**
- **MySQL or MariaDB** running locally, with a database named `studyos` created

### Run
Open **PowerShell** in the repository root and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-full.ps1
```

What `setup-full.ps1` does:
1. Verifies prerequisites (Node, npm, PHP, Composer)
2. Sets up the frontend (creates `.env`, runs `npm install`)
3. Generates the Laravel backend skeleton and overlays the API source from `backend-overlay/`
4. Configures `backend/.env` for the MySQL `studyos` database
5. Runs `php artisan migrate` and `php artisan test`
6. Starts the backend (`php artisan serve`) and frontend (`npm run dev`) servers
7. Opens the app in your default browser

After it finishes:
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://127.0.0.1:8000`

## Manual setup (step by step)

### Frontend
```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```
Vite runs at `http://localhost:5173`. Change `VITE_API_BASE_URL` in `frontend/.env` if the API uses another URL.

### Backend
```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-backend.ps1
```
Configure `backend/.env` (`DB_CONNECTION=mysql`, `DB_DATABASE=studyos`, and your local `DB_USERNAME`/`DB_PASSWORD`). Then from the `backend` directory:

```powershell
cd backend
php artisan migrate
php artisan test
php artisan serve
```
Laravel serves the API at `http://127.0.0.1:8000`.

## Open in browser (instant)

Once the dev servers are running, double-click:

```powershell
.\scripts\open-browser.bat
```

This opens `http://localhost:5173` (frontend) in your default browser.

## API endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | name, email, password, password_confirmation |
| POST | `/auth/login` | — | email, password |
| GET | `/auth/me` | Bearer token | current authenticated user |
| POST | `/auth/logout` | Bearer token | revoke current token |
| GET | `/tasks` | Bearer token | list the user's tasks |
| POST | `/tasks` | Bearer token | create a task |
| PATCH | `/tasks/{id}` | Bearer token | update a task (owner only) |
| DELETE | `/tasks/{id}` | Bearer token | delete a task (owner only) |

## Security
Never commit environment files, credentials, tokens, or production secrets. The frontend stores a bearer token in session storage as a straightforward development implementation. Before public deployment, use HTTPS, configure token expiry and rate limits, and consider Sanctum's cookie-based SPA authentication for a same-site first-party browser app.

## MVP limitations
Focus timer, subject progress, weekly plan, and the weekly goal card are presentation-only sample UI. They are not persisted analytics yet. The API and database require local Laravel/MySQL setup before authentication and task actions can work.
