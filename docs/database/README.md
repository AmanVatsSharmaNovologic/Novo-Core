## Database Configuration

This service uses TypeORM with Postgres. Configuration can be provided via either explicit `DB_*` env vars or a single `DATABASE_URL`.

### Precedence
1. Explicit `DB_*` variables
2. `DATABASE_URL`
3. Safe defaults

### Example
```env
DATABASE_URL="postgresql://admin:admin123@ec2-18-61-254-86.ap-south-2.compute.amazonaws.com:5432/novo-core?schema=public"
# If TLS is required by your provider:
# DB_SSL=true      # or append ?sslmode=require to DATABASE_URL
```

### Verify
- Start the app and call `GET /health`; expect `{ "status": "ok" }`.



