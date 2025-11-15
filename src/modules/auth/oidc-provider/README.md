# OIDC Provider (optional)

Wrapper for integrating `oidc-provider` behind an environment flag.

Files
- `oidc-provider.service.ts`: Initializes provider with TypeORM adapter and KID rotation.
- `interactions.controller.ts`: Placeholder for custom provider interactions.
- `typeorm.adapter.ts`: Storage adapter bridge for provider models.
- `oidc-provider.module.ts`: Module wiring.

Notes
- Disabled unless `OIDC_PROVIDER=true`. Current stack uses custom controllers for OIDC flows.

Changelog
- 2025‑11‑15: Initial README.


