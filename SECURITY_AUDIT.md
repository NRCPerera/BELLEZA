# Security audit

Audit date: 2026-10-08. Scope: React/Vite client and Express/MongoDB server, including committed history and dependency manifests.

## Critical

| Finding | Location | Status |
|---|---|---|
| JWT was returned to browser JavaScript and persisted in `localStorage`, allowing XSS token theft. | `client/src/api.js`, `client/src/context/AuthContext.jsx`, `server/src/routes/auth.js` | Fixed: httpOnly cookie-only 8-hour sessions; client no longer stores or sends bearer JWTs. |
| Booking lock could continue without acquiring the distributed lock and delete another request's lock, permitting concurrent overlapping bookings. | `server/src/routes/appointments.js` | Fixed: acquire/retry lock before the conflict check and creation. |

## High

| Finding | Location | Status |
|---|---|---|
| JWT verification did not pin an algorithm, expiry was 30 days, and logout did not invalidate tokens. | `server/src/middleware/auth.js`, `server/src/routes/auth.js` | Fixed: HS256-only, 8-hour expiry, per-user session version, logout invalidation. |
| Password hashing cost was 10 and password requirements were weak. | `server/src/models/User.js`, `server/src/routes/auth.js`, `server/src/routes/admin.js` | Fixed: bcrypt cost 12, 12-character mixed-case/numeric user password policy, strengthened temporary-password minimum. |
| Required first-password change was enforced only in the UI. | `server/src/middleware/auth.js` | Fixed: all protected routes are denied until the password-change route completes. |
| No CSRF control protected cookie-authenticated mutating requests. | Client/server auth flow | Fixed: per-session CSRF token cookie plus header validation. |
| Service and staff admin endpoints passed request bodies directly into Mongoose. | `server/src/routes/services.js`, `server/src/routes/staff.js` | Fixed: explicit field allowlists. |
| Upload validation relied on client MIME metadata and did not sanitize image metadata. | `server/src/middleware/upload.js`, `server/src/routes/portfolio.js` | Fixed: magic-byte verification for JPG/PNG/WebP and MP4/WebM/MOV, 5 MB image and 50 MB video caps, 90-second video limit, staff ownership enforcement, and EXIF/GPS stripping for images. |

## Medium

| Finding | Location | Status |
|---|---|---|
| Missing global security headers, parameter pollution protection, payload sanitization, and global rate limit. | `server/src/index.js` | Fixed: Helmet CSP/HSTS/referrer policy, HPP, Mongo operator rejection/sanitization, size limits, global rate limit. |
| Login endpoint lacked account lockout and audit events. | `server/src/routes/auth.js` | Fixed: 5-failure, 15-minute lockout plus generic errors and audit records. |
| Email templates interpolated user-controlled fields into HTML. | `server/src/services/emailService.js` | Fixed: HTML escaping and constrained booking references. |
| Environment validation only checked two variables. | `server/src/index.js` | Fixed: Zod startup validation and production consistency checks. |
| Admin/auth events had no durable audit trail. | server | Fixed: TTL-backed `AuditLog` model and auth/admin-service/staff audit events. |
| Dependency audit reported vulnerable Express/Mongoose dependency tree. | `server/package-lock.json` | Fixed: production dependency lockfile updated; `npm audit --omit=dev` reports zero vulnerabilities. |

## Low

| Finding | Location | Status |
|---|---|---|
| Route parameter/query validation is inconsistent on legacy public and admin read endpoints. | `server/src/routes/*.js` | Partially fixed by operator rejection and explicit casting already present in pagination; add per-route validators in a follow-up. |
| Vulnerable client HTTP/router packages. | `client/package.json`, `client/package-lock.json` | Fixed: updated Axios and React Router dependency tree; production audit reports zero vulnerabilities. |
| No committed dependency update automation. | repository root | Fixed: `.github/dependabot.yml`. |
| Secret scan found example placeholders only in tracked files; `server/.env` is untracked. Historical scan should still be repeated with a dedicated secret scanner before production. | `.gitignore`, git history | Manual follow-up required. |
