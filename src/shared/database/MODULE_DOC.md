## Module: shared/database

Purpose: Provide global TypeORM configuration, naming strategy, and connection bootstrap.

### Overview
- Loads DB configuration from validated env via `AppConfig`.
- Supports `DATABASE_URL` (Postgres) including `schema`, `ssl`/`sslmode` flags.
- Applies `SnakeNamingStrategy` and disables auto-sync (migrations recommended).

### Configuration
- Env precedence: explicit `DB_*` vars > `DATABASE_URL` > defaults.
- Example:

```env
DATABASE_URL="postgresql://admin:admin123@ec2-18-61-254-86.ap-south-2.compute.amazonaws.com:5432/novo-core?schema=public"
# If your Postgres requires TLS:
# DB_SSL=true  # or add ?sslmode=require to DATABASE_URL
```

### Health Check
Use `GET /health` which executes `SELECT 1` via the app datasource.

### Changelog
- 2025-11-08: Added `DATABASE_URL` parsing with schema + SSL support and forwarded `schema` to TypeORM options.



