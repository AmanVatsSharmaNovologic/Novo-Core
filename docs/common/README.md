# Common Module

- Feature-scoped common utilities (filters, middleware)
- Request context propagation and global error normalization for HTTP + GraphQL.
- Domain errors remain in `src/common/errors/`.

## Components

- `RequestContextMiddleware` – attaches `requestId` and initializes AsyncLocalStorage-backed context.
- `HttpErrorFilter` – maps `AppError` and `HttpException` into structured JSON for REST endpoints.
- `GraphqlExceptionFilter` – mirrors HTTP filter behavior for GraphQL; logs stack + `requestId` and
  normalizes `AppError` into GraphQL-friendly error responses.
- `CsrfGuard` – double-submit cookie protection for form POSTs.
- `GqlThrottlerGuard` – GraphQL-aware throttling that derives `req`/`res` for both HTTP and Yoga contexts
  without `req.ip` runtime errors.

## Changelog

- 2025-11-15 IST: Migrated GraphQL server driver from Apollo to GraphQL Yoga (kept query complexity rule,
  added CSRF prevention plugin, enabled GraphiQL in non-prod). Future work: add SSE-based subscriptions.
- 2025-11-30 IST: Added `GraphqlExceptionFilter` and `GqlThrottlerGuard` for robust, observable GraphQL
  error handling and rate limiting.

