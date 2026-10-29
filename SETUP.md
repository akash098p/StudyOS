# StudyOS — Windows setup

## Requirements
- Node.js 20+ and npm
- PHP 8.2+ with PDO MySQL support and Composer 2
- MySQL or MariaDB

## Frontend
Open PowerShell in the repository root:
    cd frontend
    Copy-Item .env.example .env
    npm install
    npm run dev
Vite runs at http://localhost:5173. Change VITE_API_BASE_URL in frontend/.env if the API uses another URL.

## Backend
Laravel framework files and vendor dependencies are generated locally rather than vendored into Git:
    composer create-project laravel/laravel backend "^12.0"
    cd backend
    php artisan install:api

Create a MySQL database named studyos. Configure backend/.env with DB_CONNECTION=mysql, DB_HOST=127.0.0.1, DB_PORT=3306, DB_DATABASE=studyos, and your local credentials. Never commit .env.

Copy the files in backend-overlay/ into matching paths inside backend/, replacing routes/api.php. Merge backend-overlay/app/Models/User.php.patch into the generated User model; do not replace the generated file. Then run:
    php artisan migrate
    php artisan route:list --path=api
    php artisan serve

The default API URL is http://127.0.0.1:8000/api.

## Endpoints
- POST /auth/register: name, email, password, password_confirmation
- POST /auth/login: email, password
- GET /auth/me and POST /auth/logout: Bearer token required
- GET/POST /tasks and PATCH/DELETE /tasks/{id}: Bearer token required

The frontend stores the token in session storage. Tasks are persisted to MySQL and scoped to the authenticated user. Use HTTPS and review token expiry/revocation before public deployment.

## Troubleshooting
- If the frontend cannot reach the API, confirm Laravel is running and VITE_API_BASE_URL is correct; restart Vite after env changes.
- If API routes are missing, rerun php artisan install:api and confirm routes/api.php exists.
- If MySQL connection fails, verify the service and .env credentials.
