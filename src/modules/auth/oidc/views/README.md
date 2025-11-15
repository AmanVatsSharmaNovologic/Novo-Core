# OIDC Views

EJS templates for OP login and consent screens.

Files
- `login.ejs`: Email/password login form with CSRF token and flow parameters.
- `consent.ejs`: Consent confirmation form with CSRF token and requested scopes.

Notes
- CSRF token is set via cookie; forms include hidden `csrf_token`.

Changelog
- 2025‑11‑15: Initial README.


