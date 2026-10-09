# Momentum API

Momentum is an open-source client relationship management (CRM) application. This repository contains the NestJS backend for authentication, lead management, pipeline and follow-up tracking, activity history, notifications, and reminder email delivery. The API is consumed by the Momentum frontend; no frontend repository URL is configured in this repository, so none is linked here.

## Features

- Google ID-token login, JWT access tokens, refresh-token rotation, and onboarding.
- Protected, user-scoped lead CRUD with lead status, source, contact details, notes, and follow-up dates.
- Dashboard overview, pipeline counts, recent activities, and follow-ups needing attention.
- Lead activity history for notes, calls, email, meetings, status changes, and follow-up changes.
- In-app follow-up notifications, unread counts, mark-read operations, and deletion.
- Daily processing of due and overdue follow-ups with deduplicated notifications and reminder emails.
- User profile name and default lead-source settings.

Email verification fields and a verification guard exist in the data model, but this repository does not expose a verification-email flow. Protected requests for users whose stored email is not verified are rejected.

## Tech stack

- Node.js and TypeScript (the repository does not declare a Node.js version or `engines` field)
- NestJS 12
- Prisma 7.9.1 with `@prisma/adapter-pg`
- PostgreSQL
- Redis via ioredis (used for refresh-token concurrency coordination)
- Google Auth Library
- JWT via `@nestjs/jwt`
- Nodemailer and Mailtrap for non-production email; Resend for production email
- pnpm (the repository contains `pnpm-lock.yaml` and `pnpm-workspace.yaml`)
- Vitest, Supertest, Prettier, and oxlint

## Architecture

`src/main.ts` bootstraps the Nest application with the global `/api/v1` prefix, CORS, request logging, throttling, and a whitelist/transformation `ValidationPipe`. `AppModule` loads the feature modules and registers global authentication, throttling, and email-verification guards.

Controllers define HTTP routes and delegate to services. Services enforce user ownership and business rules, while `PrismaService` uses Prisma's PostgreSQL adapter and `DATABASE_URL` to access the database. Redis is initialized by `RedisService` and stores short-lived refresh-token locks and refresh results so concurrent refresh requests are coordinated.

The main relationships are:

- A `User` owns many `Lead`, `Notification`, and `RefreshSession` records.
- A `Lead` belongs to a user and owns many `LeadActivity` records.
- A `Notification` belongs to a user and may reference a lead.
- Deleting a user or lead cascades to the related records defined in `prisma/schema.prisma`.

The daily reminder endpoint queries due and overdue leads, creates deduplicated notifications, and sends one email per affected user. The GitHub Actions workflow invokes this endpoint on a Lagos-time schedule.

## Prerequisites

Install:

1. A Node.js release compatible with the current NestJS, TypeScript, and Prisma dependencies. No exact Node.js floor is declared in this repository; confirm the project maintainer's chosen version before publishing a support policy.
2. pnpm.
3. PostgreSQL and a database that the contributor can migrate.
4. Redis, because the application creates a Redis client during startup.
5. Developer-owned Google OAuth credentials for Google login.
6. Mailtrap credentials for local email delivery, or Resend credentials for production-mode email.

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/codewithemma/momentum-api.git
cd momentum-api
pnpm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env`. Fill in the values described in [Environment variables](#environment-variables).

Create a PostgreSQL database and set `DATABASE_URL` to its connection string. Start Redis and set `REDIS_URL` to the Redis URL reachable by the API. For local development, use `NODE_ENV=development` and Mailtrap credentials. Do not use production credentials in a local `.env` file.

### 3. Generate the Prisma client and apply migrations

```bash
pnpm prisma generate
pnpm prisma migrate deploy
```

The Prisma configuration reads `DATABASE_URL`, uses `prisma/schema.prisma`, and stores migrations in `prisma/migrations`. `migrate deploy` applies the committed migrations without resetting the database.

### 4. Run the API

```bash
pnpm start:dev
```

The server listens on `PORT` (default `3000`) and routes are available below `/api/v1`. The root health-style starter route is `GET /api/v1/` and returns the application greeting.

### 5. Build and run production output locally

```bash
pnpm build
pnpm start:prod
```

Production-mode email uses Resend, so configure the production variables before running with `NODE_ENV=production`.

## Environment variables

`ConfigModule` loads `.env`; the Prisma config and services also read these names directly.

| Variable | Required | Description | Safe example |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | Selects development Mailtrap or production Resend delivery. | `development` |
| `PORT` | No | HTTP port; defaults to `3000` when unset. | `3000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma and the PostgreSQL adapter. | `postgresql://postgres:password@localhost:5432/momentum?schema=public` |
| `REDIS_URL` | Yes | Redis connection used by authentication refresh coordination. | `redis://localhost:6379` |
| `JWT_SECRET_KEY` | Yes | Secret used to sign and verify access and refresh JWTs. Generate a private random value. | `replace-with-a-long-random-secret` |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client ID passed to the Google token verifier. | `your-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_ID` | Yes | Audience checked when verifying the Google ID token. | `your-client-id.apps.googleusercontent.com` |
| `CORS_ORIGINS` | Yes for browser clients | Comma-separated allowed origins. | `http://localhost:3001` |
| `FRONTEND_URL` | Yes for reminder links | Base frontend URL used in reminder email dashboard links. | `http://localhost:3001` |
| `CRON_SECRET` | Yes when using reminders | Secret expected in the `x-cron-secret` header for the internal reminder endpoint. | `replace-with-a-random-secret` |
| `RESEND_API_KEY` | Yes at startup; used for delivery in production | Resend is constructed during application startup; the API key is used to send mail when `NODE_ENV=production`. Use a developer-owned key locally even when Mailtrap is the selected delivery path. | `re_your_developer_key` |
| `MAILTRAP_HOST` | Development | SMTP host used when `NODE_ENV` is not `production`. | `sandbox.smtp.mailtrap.io` |
| `MAILTRAP_PORT` | Development | SMTP port used by Nodemailer. | `2525` |
| `MAILTRAP_USER` | Development | Mailtrap SMTP username. | `your-mailtrap-user` |
| `MAILTRAP_PASSWORD` | Development | Mailtrap SMTP password. | `your-mailtrap-password` |

`DATABASE_URL` is the only database URL supported by the checked-in Prisma configuration; there is no `DIRECT_URL` setting. The application does not provide a mail mock or disable Redis automatically, so local contributors should use their own Mailtrap account, a syntactically valid developer Resend key, and a local Redis instance. Never commit `.env` or credentials.

## API documentation

All routes below are relative to `/api/v1`. Unless marked public, routes require `Authorization: Bearer <access-token>`. The global email-verification guard also applies to authenticated routes unless the route explicitly bypasses it.

### Authentication

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/google-login` | Public | Verify a Google ID token and return the user, access token, and refresh token. Body: `{ "idToken": "..." }`. |
| `POST` | `/auth/complete-onboarding` | Bearer token; verified email required | Save `role`, non-empty `clientSources`, and `referralSource`. |
| `POST` | `/auth/refresh` | Public | Rotate a refresh token. Body: `{ "refreshToken": "..." }`. |

### Leads and activities

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/leads/create` | Bearer token; verified email required | Create a lead. Fields include `name`, `company`, `email`, `phone`, `website`, `industry`, `source`, `status`, `notes`, and `nextFollowUpAt`. |
| `GET` | `/leads` | Bearer token; verified email required | List the current user's leads. Query: optional `search`, `source`, `page` (default `1`), and `limit` (default `20`, maximum `100`). |
| `GET` | `/leads/:id` | Bearer token; verified email required | Get one lead owned by the current user. |
| `PATCH` | `/leads/:id` | Bearer token; verified email required | Update any supported lead fields. |
| `DELETE` | `/leads/:id` | Bearer token; verified email required | Delete an owned lead. |
| `GET` | `/leads/:leadId/activities` | Bearer token; verified email required | List a lead's activities. |
| `POST` | `/leads/:leadId/activities` | Bearer token; verified email required | Add an activity with `type`, `title`, and optional `description`. |

### Dashboard, notifications, and users

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/dashboard/overview` | Bearer token; verified email required | Return total, active, due, and won lead counts. |
| `GET` | `/dashboard/recent-activities` | Bearer token; verified email required | Return the six most recent activities. |
| `GET` | `/dashboard/pipeline` | Bearer token; verified email required | Return counts for each `LeadStatus`. |
| `GET` | `/dashboard/needs-attention` | Bearer token; verified email required | Return up to five overdue, due-today, and upcoming follow-ups. |
| `GET` | `/notifications` | Bearer token; verified email required | List the current user's notifications. |
| `GET` | `/notifications/unread-count` | Bearer token; verified email required | Return the unread notification count. |
| `PATCH` | `/notifications/:id/read` | Bearer token; verified email required | Mark one notification as read. |
| `PATCH` | `/notifications/read-all` | Bearer token; verified email required | Mark all notifications as read. |
| `DELETE` | `/notifications/:id` | Bearer token; verified email required | Delete one notification. |
| `PATCH` | `/users/me` | Bearer token; verified email required | Update the user's name with body field `name`. |
| `PATCH` | `/users/me/default-lead-source` | Bearer token; verified email required | Update `defaultLeadSource`. |

### Internal reminders

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/internal/reminders/daily` | Public route with `x-cron-secret` | Process Lagos-day due and overdue reminders. The header must equal `CRON_SECRET`. |

Swagger/OpenAPI is not configured in the current application, so there is no Swagger UI URL.

## Database and migrations

The Prisma schema uses PostgreSQL and generates the client into `src/generated/prisma`. The schema models users, leads, lead activities, notifications, and refresh sessions, with enums for roles, lead sources/statuses, activity types, and notification types. Ownership and lookup indexes are defined in `prisma/schema.prisma`; notification `dedupeKey` and refresh-session `tokenHash` are unique.

For a fresh local database:

```bash
pnpm prisma generate
pnpm prisma migrate deploy
```

When changing the schema during development, create and review a migration with the Prisma 7 tooling before opening a pull request. Never reset, drop, or migrate a production database as a routine setup step.

## Authentication

The frontend obtains a Google ID token and sends it to `POST /api/v1/auth/google-login`. The API verifies the token with Google using the configured client ID, creates the user if necessary, then returns a short-lived access token and a refresh token. Access tokens are sent as Bearer tokens. Refresh tokens are stored as hashes in PostgreSQL, rotated on refresh, and coordinated through Redis.

Contributors must create their own Google OAuth client and configure both Google client-ID variables as described above. Do not publish tokens, client secrets, signing keys, or user data.

## Email and notifications

The daily reminder job is application functionality exposed through `/internal/reminders/daily`; it creates deduplicated in-app notifications and sends follow-up reminder emails only for newly created notifications. In development, Nodemailer sends through Mailtrap. In production, Resend sends from the configured Momentum notification address. The repository contains no verification-email sending flow, despite storing email-verification state.

The checked-in GitHub Actions workflow runs at `06:10` in `Africa/Lagos` and can also be started manually. It calls the internal endpoint using repository secrets named `CRON_SECRET` and `BASE_URL`. Configure those secrets in the deployment repository; never place their values in source or documentation.

## Deployment

A compatible deployment must provide PostgreSQL, Redis, the environment variables above, and a process that runs:

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
pnpm build
pnpm start:prod
```

The repository includes a scheduled GitHub Actions workflow but does not include a platform-specific application deployment configuration. Configure `BASE_URL` for the workflow as the deployed API base URL. The Prisma config supports only `DATABASE_URL`; it does not define separate pooled and direct migration URLs, so use a connection string compatible with both the running adapter and Prisma migrations.

## Project structure

```text
src/auth/           Google login, JWT refresh, onboarding, and guards
src/leads/          Lead and lead-activity controllers, DTOs, and services
src/dashboard/      Dashboard aggregation endpoints
src/notifications/  Notification APIs and reminder processing
src/users/          Profile and lead-source settings
src/mail/           Reminder email service and template
src/internal/       Secret-protected scheduled-job endpoint
src/prisma/         Prisma service and module
src/redis/          Redis client module
prisma/             Schema and committed migrations
.github/workflows/  Scheduled daily reminder workflow
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, coding conventions, testing expectations, and pull request requirements.

## Security

Do not report vulnerabilities in a public issue. The repository does not currently declare a private security contact, so maintainers must add one before launch. Until then, avoid publishing exploit details and contact the project maintainers through the private channel they designate.

## License

Momentum API is licensed under the [MIT License](LICENSE).
