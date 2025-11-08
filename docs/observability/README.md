## Operational Checks — DB Health Probe

Use the DB health CLI to live-check PostgreSQL connectivity with the same credentials the app uses.

Scripts
- One-off probe (CI-friendly, exits non‑zero on failure):
  - `npm run db:health`
- Continuous watch (every 5s):
  - `npm run db:health:watch`
- Add flags:
  - `--json` for line-delimited JSON output
  - `--interval=2000` to change polling interval
  - `--extensions` to assert `uuid-ossp` and `pgcrypto` are installed

Example
```
$ npm run -s db:health
{"ts":"2025-11-08T12:34:56.789Z","ok":true,"latencyMs":12,"version":"16.4"}
```

Exit codes
- `0`: healthy
- `2`: connection refused (host/port/firewall)
- `3`: authentication failed (user/password)
- `4`: connection timeout (network / security group)
- `5`: required extension missing (`uuid-ossp` or `pgcrypto`)
- `1`: generic error

Environment
- The probe reads `.env` via `src/shared/config/config.factory.ts` (dotenv) using:
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
  - For local Postgres without TLS, set `DB_SSL=false`
  - For managed TLS, set `DB_SSL=true`; if your CA is custom, extend config to load a CA file


