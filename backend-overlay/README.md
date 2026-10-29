# Laravel API overlay

Copy these files into a fresh Laravel 12 project after running php artisan install:api. See the repository-level SETUP.md for the full Windows setup.

The overlay provides Sanctum token authentication, per-user task CRUD, and PHPUnit feature tests. Copy the test files into backend/tests/Feature/ after generating the Laravel app. Merge the User model patch into the generated model. Never commit environment secrets.