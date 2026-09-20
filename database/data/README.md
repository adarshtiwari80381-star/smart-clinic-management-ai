# Database Data & Backups

This folder contains persistent snapshots, JSON backups, and export dumps from the Clinic Management System AI.

When `database/seed/seeder.js` is executed, it automatically writes a snapshot of the seeded entities into `latest_seed_backup.json` in this directory for audit and recovery.
