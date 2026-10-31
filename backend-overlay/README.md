# Laravel API overlay

Copy these files into a fresh Laravel 12 project after running php artisan install:api. See the repository-level SETUP.md for the full Windows setup.

The overlay provides Sanctum token authentication, per-user task CRUD and planning fields, daily study goals, focus-session history, migrations, and PHPUnit feature tests. The setup script copies the overlay into the generated Laravel app and merges the User model relationships and daily-goal casting. PHPUnit is configured to use an in-memory SQLite database. Never commit environment secrets.
