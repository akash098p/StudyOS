# Laravel API overlay

Copy these files into a fresh Laravel 12 project after running php artisan install:api. See the repository-level SETUP.md for the full Windows setup. The overlay provides Sanctum token authentication and per-user task CRUD. Merge the User model patch into the generated model. Never commit environment secrets.