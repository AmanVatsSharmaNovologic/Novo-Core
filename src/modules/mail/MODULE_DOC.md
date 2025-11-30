/**
 * @file MODULE_DOC.md
 * @module modules/mail
 * @description Mail module documentation - reusable email service for microservices
 * @author BharatERP
 * @created 2025-12-01
 */

# Mail Module

## Purpose

The Mail module provides a reusable email sending service that can be used across microservices. It handles SMTP configuration, email templating, and email verification flows.

## Architecture

### Module Structure

```
src/modules/mail/
├── mail.module.ts              # Global module export
├── services/
│   ├── mail.service.ts         # Core SMTP email sending service
│   └── email-verification.service.ts  # Email verification token management
├── entities/
│   └── email-verification.entity.ts  # Email verification token storage
├── resolvers/
│   └── mail.resolver.ts        # GraphQL resolvers for email verification
├── dtos/
│   └── graphql-types.ts       # GraphQL type definitions
├── templates/
│   ├── verification-email.html  # HTML email template
│   └── verification-email.txt   # Plain text email template
└── MODULE_DOC.md               # This file
```

### Key Components

1. **MailService**: Handles SMTP connection and email sending
2. **EmailVerificationService**: Manages verification tokens and verification flow
3. **EmailVerification Entity**: Stores verification tokens with expiration
4. **MailResolver**: GraphQL API for email verification operations

## Configuration

### Environment Variables

The mail module requires the following environment variables (all optional - mail service is disabled if not configured):

- `MAIL_HOST` - SMTP server hostname
- `MAIL_PORT` - SMTP server port (default: 587 for TLS, 465 for SSL)
- `MAIL_SECURE` - Use TLS/SSL (boolean, default: true)
- `MAIL_USER` - SMTP username
- `MAIL_PASSWORD` - SMTP password
- `MAIL_FROM` - From email address (required if mail is enabled)
- `MAIL_FROM_NAME` - From name (default: "NovoLogic")

### Example Configuration

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=true
MAIL_USER=noreply@novologic.co
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@novologic.co
MAIL_FROM_NAME=NovoLogic
```

## Usage

### Injecting MailService

Since MailModule is `@Global()`, you can inject `MailService` and `EmailVerificationService` in any module:

```typescript
import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/services/mail.service';

@Injectable()
export class MyService {
  constructor(private readonly mailService: MailService) {}

  async sendWelcomeEmail(email: string) {
    await this.mailService.sendEmail({
      to: email,
      subject: 'Welcome!',
      html: '<h1>Welcome</h1>',
      text: 'Welcome',
    });
  }
}
```

### Email Verification Flow

#### 1. Create Verification Token

```typescript
import { EmailVerificationService } from '../mail/services/email-verification.service';

// After user registration
const token = await emailVerificationService.createVerificationToken(
  identityId,
  email
);
// Email is automatically sent with verification link
```

#### 2. Verify Email

```typescript
// Via REST endpoint: GET /public/verify-email?token=<token>
// Or via GraphQL mutation
const result = await emailVerificationService.verifyEmail(token);
// Returns: { identityId, email }
```

#### 3. Resend Verification Email

```typescript
await emailVerificationService.resendVerificationEmail(email);
```

## Email Templates

Templates are stored in `templates/` directory and use simple variable replacement:

- Variables are replaced using `{{variableName}}` syntax
- Both HTML and text versions should be provided
- Templates are loaded at runtime from the filesystem

### Template Variables

**verification-email** template:
- `{{verificationUrl}}` - Full URL to verification endpoint with token
- `{{year}}` - Current year

## Database Schema

### email_verifications Table

```sql
CREATE TABLE email_verifications (
  id uuid PRIMARY KEY,
  identity_id uuid NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  email varchar(320) NOT NULL,
  token_hash varchar(255) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Identity Table Updates

Added fields to `identities` table:
- `email_verified` (boolean, default: false)
- `email_verified_at` (timestamptz, nullable)

## Security Considerations

1. **Token Hashing**: Verification tokens are hashed (SHA256) before storage
2. **Token Expiration**: Tokens expire after 24 hours
3. **Email Enumeration Prevention**: Resend endpoint always returns success
4. **Cryptographically Secure Tokens**: Uses `crypto.randomBytes()` for token generation

## GraphQL API

### Mutations

- `verifyEmail(token: String!): VerifyEmailResult!` - Verify email with token
- `resendVerificationEmail(email: String!): Boolean!` - Resend verification email

### Queries

- `checkEmailVerificationStatus: EmailVerificationStatus!` - Check verification status (requires auth; protected by global rate limiting and GraphQL-aware guards)

## REST API

- `GET /public/verify-email?token=<token>` - Verify email (redirects to frontend)
- `POST /public/resend-verification` - Resend verification email

## Error Handling

Domain errors are defined in `src/common/errors/email-verification.error.ts`:

- `EmailVerificationExpiredError` - Token has expired
- `EmailVerificationInvalidError` - Token is invalid
- `EmailAlreadyVerifiedError` - Email already verified
- `EmailVerificationNotFoundError` - Token not found

These are automatically mapped to HTTP status codes by the exception filter.

## Integration with Registration

The registration flow (`PublicRegistrationService`) automatically:

1. Sets `emailVerified: false` on new identities
2. Sets identity `status: 'pending'` until email is verified
3. Creates and sends verification email after successful registration
4. Activates identity (`status: 'active'`) after email verification

## Future Enhancements

- [ ] Email queue support (BullMQ) for async sending
- [ ] Template engine (Handlebars) for more complex templates
- [ ] Multi-language email support
- [ ] Email delivery tracking
- [ ] OAuth2 SMTP authentication support
- [ ] Email batching for bulk sends

## Changelog

- **2025-12-01**: Initial implementation
  - MailService with SMTP support
  - Email verification flow
  - GraphQL and REST APIs
  - Integration with registration
  - `checkEmailVerificationStatus` query wired through `GraphqlAuthGuard`
+ **2025-11-30**: GraphQL infra hardening
  - Introduced `GqlThrottlerGuard` to avoid `req.ip` undefined errors for GraphQL operations.
  - `checkEmailVerificationStatus` now benefits from safe rate limiting in GraphQL flows.


