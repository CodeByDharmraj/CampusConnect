# CampusConnect

CampusConnect is a role-based academic and campus-life portal built with
React, Vite, Tailwind CSS, Node.js, Express, and MongoDB.

## Project structure

- `client/` — React frontend
- `server/` — Express backend
- `server/src/app.js` — Express application and API routes
- `server/src/server.js` — HTTP server startup

## Prerequisites

- Node.js and npm
- Git
- A modern web browser

MongoDB Atlas and private object storage will be configured in later
development phases.

## Install dependencies

From the project root:

```powershell
npm --prefix client install
npm --prefix server install
```

## Backend test commands

From the project root:

```powershell
npm --prefix server run test:security
npm --prefix server run test:regression
```

MongoDB-backed refresh-session integration tests are opt-in:

```powershell
$env:NODE_ENV = "test"
$env:RUN_REFRESH_INTEGRATION_TESTS = "true"
npm --prefix server run test:integration
```

Use a dedicated test database named `campusconnect_test`. Never point integration tests at a production database.

### Focused announcement and event regression tests

From `server/`, run `npm run test:campus` to execute the Phase 50 announcement, event lifecycle, ownership, and registration-capacity suites. These suites are included in `npm run test:security` and the full `npm run test:regression` command.
### Frontend regression tests

From the `client` directory, run the focused Phase 51 route, form, submission-state, and dashboard suites with:

```bash
npm run test:frontend-regression
```

Run the complete frontend test suite with `npm test`. Phase 51 tests are authored but have not been executed; final verification is scheduled for Phase 60.

## End-to-end browser tests

The Playwright academic workflow is documented in `PHASE-52-IMPLEMENTATION-NOTES.md`. It covers faculty assignment publishing, student file submission, faculty grading, and student verification. Configure the dedicated test accounts and test storage before running `cd client && npm run test:e2e`. Do not run against production data.

The Playwright campus event workflow is documented in `PHASE-53-IMPLEMENTATION-NOTES.md`. It covers coordinator event creation and publishing, student registration, and coordinator attendance marking after the event starts. Configure the dedicated coordinator/student accounts and a department with an active coordinator-managed club before running `cd client && npm run test:e2e` during Phase 60. Do not run against production data.


## Responsive and accessibility regression

Phase 54 adds Playwright coverage for 320px, 375px, 768px, 1024px, and 1440px viewports, skip navigation, labelled login controls, and mobile drawer keyboard behavior. Run the focused suite from `client/` with `npm run test:responsive-accessibility` during Phase 60. See `PHASE-54-IMPLEMENTATION-NOTES.md` for scope and manual-audit limitations.


## Phase 55 — Frontend performance and bundle budgets

Phase 55 introduces route-level code splitting: application pages are loaded only when their route is visited, instead of placing every page module in the initial JavaScript bundle. A compact accessible loading skeleton is shown while a route chunk is fetched.

The TanStack Query cache explicitly retains inactive query data for five minutes while keeping the existing 30-second freshness window. This improves back-navigation/revisit behavior without changing the freshness policy.

After a production build, run `cd client && npm run budget` to report gzip-compressed JavaScript and CSS asset sizes. The guardrails are 250 KiB per emitted JavaScript asset and 100 KiB per emitted CSS asset. Adjust a budget only after measuring a real production build and documenting why the change is justified.

The Vite production configuration keeps CSS code splitting enabled, disables source maps in production output, and reports compressed asset sizes. No production build or runtime performance measurement is claimed in this phase; all execution remains deferred until Phase 60.


## Phase 56 — CI/CD and deployment automation

GitHub Actions CI is configured for pull requests and pushes to `main`; automatic jobs stay gated until the repository Actions variable `ENABLE_CI` is set to `true` during Phase 60. An explicitly approved manual `workflow_dispatch` runs CI before then. See `.github/workflows/ci.yml`.

Production deployment is a separate manual workflow. After configuring `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub Actions secrets, an authorized maintainer can run `.github/workflows/deploy-production.yml` from the Actions tab. Review `PHASE-56-IMPLEMENTATION-NOTES.md` before configuring or deploying. Never commit `.env` files or production credentials.


## Phase 57 — Development database seed

The development seed is opt-in and idempotent. It creates or reuses a CSE department, three course offerings, demo admin/faculty/coordinator/student accounts, faculty assignments, enrollments, timetable entries, published assignments, historical attendance, scoped announcements, a technical club, and a future published event.

1. Copy `server/.env.example` to `server/.env` if you have not already done so.
2. Set `NODE_ENV=development`, `ALLOW_DEMO_SEED=true`, and a development `MONGODB_URI`.
3. Configure the five `SEED_*_PASSWORD` values only for demo accounts that do not already exist. Use local-only passwords.
4. Optionally adjust `SEED_ACADEMIC_YEAR` and `SEED_SEMESTER`.
5. From the project root, run `npm --prefix server run seed:development`.

The script refuses to run outside `NODE_ENV=development` or without `ALLOW_DEMO_SEED=true`. It never deletes collections, resets passwords, reactivates inactive users, changes existing enrollment statuses, or overwrites existing records. If an existing demo account has the wrong role or department, it stops with an actionable error. Seed passwords are never printed.

The seeded attendance dates are fixed historical dates so repeated runs do not create a new session each time. The event is scheduled in the future; an unused demo event's schedule is refreshed on rerun, while events with registrations or terminal lifecycle states are left unchanged. The seed does not create fake object-storage files or submissions because those require real private-storage objects.


## Technical documentation

Phase 58 adds a maintained documentation set under `docs/`:

- Start with [`docs/README.md`](docs/README.md) for the documentation index.
- [`docs/TECHNICAL-ARCHITECTURE.md`](docs/TECHNICAL-ARCHITECTURE.md) explains the system architecture, request lifecycle, authentication, authorization, file handling, and deployment layout.
- [`docs/DATABASE-ERD.md`](docs/DATABASE-ERD.md) documents the MongoDB entities, relationships, indexes, and data lifecycle.
- [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md) lists the implemented API routes, access scopes, and file/attendance/event workflows.
- [`docs/openapi.yaml`](docs/openapi.yaml) provides an OpenAPI 3.1 route catalogue. Detailed request schemas remain in the server validation modules; the specification does not fabricate payload fields.

Keep the documentation synchronized whenever a model, route, validation rule, or service contract changes.


## Phase 59 — Screenshots, presentation, and demo preparation

- Demo instructions: [`docs/DEMO-RUNBOOK.md`](docs/DEMO-RUNBOOK.md)
- Screenshot capture catalogue: [`docs/SCREENSHOT-CATALOGUE.md`](docs/SCREENSHOT-CATALOGUE.md)
- Editable 10-slide PowerPoint: [`presentation/CampusConnect-Project-Presentation.pptx`](presentation/CampusConnect-Project-Presentation.pptx)
- Speaker notes: [`presentation/PRESENTATION-SPEAKER-NOTES.md`](presentation/PRESENTATION-SPEAKER-NOTES.md)

To capture real screenshots, start the local backend/frontend with the Phase 57 development seed and configure the `DEMO_*_EMAIL` / `DEMO_*_PASSWORD` variables described in the screenshot catalogue. From `client/`, run `npm run demo:screenshots`. Generated screenshots are written to `artifacts/screenshots/` and ignored by Git because they may contain account data. No screenshots are fabricated or bundled in the source archive.
