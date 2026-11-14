# CampusConnect — Production Readiness Checklist

This checklist is an operational companion to Phases 46–48. It does not claim that deployment has already been completed or independently penetration-tested.

## 1. Hosting and secrets

- Deploy the React client to Vercel and the Express API to Render (or equivalent HTTPS hosts).
- Set `NODE_ENV=production` on the API.
- Set `CLIENT_ORIGIN` to the exact deployed frontend origin.
- Set `VITE_API_BASE_URL` in the frontend build environment to the HTTPS API base URL ending in `/api/v1`; production builds fail fast when this is missing or invalid.
- Generate independent random `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` values (at least 32 bytes each).
- Set `COOKIE_SECURE=true`.
- Choose `COOKIE_SAME_SITE=none` for genuinely cross-site frontend/API hosts; use `lax` only when both hosts are same-site and the cookie flow supports it.
- Set `TRUST_PROXY_HOPS` only after confirming the hosting provider's proxy topology.
- Never commit `.env`, production secrets, private keys, R2 credentials, or MongoDB credentials.
- Use a dedicated MongoDB application user with only the permissions the application needs.

## 2. MongoDB Atlas

- Require TLS and use the Atlas connection string.
- Restrict network access to the deployment's known egress addresses where practical. Avoid `0.0.0.0/0` as a permanent production rule.
- Keep automated backups enabled and define a restore procedure.
- Confirm the production database has the required indexes before opening registration.
- Use a replica-set-capable Atlas deployment because refresh-session rotation, event registration and attendance workflows use transactions.
- Do not use production data in local development or screenshots.

## 3. Cloudflare R2 / file storage

- Keep the bucket private; do not enable public bucket access for submissions or course materials.
- Use least-privilege API credentials scoped to the required bucket/actions.
- Configure all R2 environment variables together, or leave all empty when storage is not configured.
- Validate allowed file extensions, MIME type, file size, and ownership on the server.
- Keep signed download URLs short-lived and issue them only after authorization.
- Define retention and deletion rules for student submissions and course materials.

## 4. Browser and API security

- Use HTTPS for both frontend and API.
- Keep CORS restricted to the exact frontend origin.
- Keep refresh tokens in HttpOnly cookies; do not put refresh tokens in localStorage or sessionStorage.
- Keep access tokens short-lived and avoid logging tokens, cookies, passwords, or request bodies.
- Use `/api/v1/health/ready` for deployment health checks and `/api/v1/health/live` for process liveness.
- Review rate-limit behavior after deployment. The current in-memory limiter is per-process; use a shared store such as Redis before scaling to multiple API instances.
- Configure only the trusted reverse-proxy hops required by the hosting platform.

## 5. Release procedure

1. Install dependencies from lockfiles using `npm ci` in both `client` and `server`.
2. Run server unit/integration tests and client tests.
3. Run ESLint and Prettier checks.
4. Run a clean production client build.
5. Review dependency audit output and resolve high/critical exploitable findings.
6. Verify login, refresh rotation, logout, role boundaries, uploads, signed downloads, and event capacity with non-production accounts.
7. Verify browser refresh-cookie behavior in a real HTTPS deployment.
8. Verify readiness becomes HTTP 503 when MongoDB is unavailable and HTTP 200 when it is connected.
9. Create a database backup and document rollback steps.
10. Deploy to staging first; promote only after smoke checks pass.
11. Tag the release and retain the previous known-good deployment for rollback.

## 6. Monitoring and incident response

- Monitor API 5xx rates, 429 responses, latency, MongoDB connectivity, and storage errors.
- Alert on repeated authentication failures and unusual refresh-token replay events.
- Keep logs structured and free of personal data and secrets.
- Document who can rotate secrets, revoke user sessions, restore backups, and disable a compromised account.
- Define a support contact and a process for reporting security issues.

## Current implementation limitations

- Rate limits are in-memory and reset on process restart; they are not global across multiple instances.
- The application does not yet provide a full centralized audit-log/alerting pipeline.
- A readiness endpoint reports MongoDB connection state; it does not replace an external synthetic transaction monitor.
- Completing this checklist requires deployment-specific configuration and verification.
