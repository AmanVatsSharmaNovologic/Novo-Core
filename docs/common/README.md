# Common Module

- Feature-scoped common utilities (filters, middleware)
- Request context propagation and global HTTP error normalization
- Domain errors remain in `src/common/errors/`

## Changelog
- 2025-11-15 IST: Migrated GraphQL server driver from Apollo to GraphQL Yoga (kept query complexity rule, added CSRF prevention plugin, enabled GraphiQL in non-prod). Future work: add SSE-based subscriptions.


