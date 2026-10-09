# Contributing to Momentum API

Thanks for helping improve Momentum. Contributions should stay within the backend's scope: NestJS API behavior, database access, authentication, reminders, notifications, tests, and documentation.

## Local setup

Prerequisites and environment variables are documented in the [README](README.md). In brief:

```bash
pnpm install
Copy-Item .env.example .env # PowerShell; use cp on Unix-like shells
pnpm prisma generate
pnpm prisma migrate deploy
pnpm start:dev
```

Run PostgreSQL and Redis locally before starting the API. Use developer-owned Google OAuth and Mailtrap credentials. Never commit `.env`, credentials, tokens, personal data, or production logs.

## Database changes

Update `prisma/schema.prisma`, review the generated migration, and include the migration in the pull request. Regenerate the Prisma client after schema changes:

```bash
pnpm prisma generate
pnpm prisma migrate deploy
```

Never reset or drop a production database. Include migration ordering, backfill, rollback, and deployment notes in the pull request when a schema change affects existing data.

## Code conventions

- Follow the existing NestJS module layout: module, controller, service, DTOs, and tests in the relevant feature directory.
- Keep controllers focused on transport concerns and put business rules and Prisma access in services.
- Use DTOs with `class-validator` decorators for request validation. The application uses a global whitelist and transformation `ValidationPipe`.
- Preserve user ownership checks for leads, activities, notifications, and settings.
- Throw explicit NestJS HTTP exceptions for expected client errors; do not silently swallow unexpected failures.
- Use TypeScript types and the existing generated Prisma client rather than duplicating database types.
- Match the repository's Prettier settings: single quotes and trailing commas.

When adding a module, register it in `AppModule`, add its controller and service tests, and verify whether the global authentication and email-verification guards should apply. New public routes must have an explicit reason and test coverage.

## Branches and commits

Use focused branch names such as:

- `feat/lead-search`
- `fix/reminder-deduplication`
- `docs/api-setup`

Use concise conventional commits, for example:

- `feat(leads): add lead filtering`
- `fix(auth): rotate refresh sessions safely`
- `docs: document local database setup`

## Validation

Run the checks relevant to your change:

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Business logic, authentication, database access, and reminder changes should include or update unit tests. API contract changes should include controller or end-to-end coverage where practical. Include the commands you ran and their results in the pull request.

## Pull requests

Each pull request should include:

- A clear summary of the change and its user or maintainer impact.
- A related issue when one exists.
- Testing evidence, including failures or environment limitations.
- Database migration details, if the Prisma schema or data shape changed.
- Environment-variable impact, if configuration changed.
- Any API contract or deployment considerations.

Do not include secrets, access tokens, passwords, personal information, or unsanitized production logs in issues or pull requests.
