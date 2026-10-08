# Belleza Performance Report

Measured on 2026-10-08 (Asia/Calcutta). The client measurements use the same Windows workstation, Chrome headless mobile Lighthouse profile, Vite production build, and landing-page URL before and after. Baseline is the preserved pre-change run; after values are the median of three production-build runs (the individual LCP results were 2,329 ms, 2,336 ms, and 2,663 ms). Database explains use the configured Atlas database. API cache timings use the optimized server locally against that same Atlas database; production-network baseline numbers are shown separately and are not presented as a like-for-like latency comparison.

## Executive summary

The public landing route no longer downloads the admin/staff applications, React Big Calendar, Moment, or Recharts. It also no longer waits for or sends an authentication request on a public-only visit.

| Metric | Baseline | After | Change / target |
| --- | ---: | ---: | ---: |
| Lighthouse performance | 73 | 97 | +24 points |
| LCP | 3,943 ms | 2,336 ms | -40.8%; target < 2,500 ms met |
| FCP | 3,013 ms | 1,922 ms | -36.2% |
| CLS | 0.077 | 0.000 | target < 0.1 met |
| Total blocking time (lab INP proxy) | 0 ms | 3 ms | well below 200 ms; field INP still needs RUM |
| Speed Index | 9,571 ms | 1,922 ms | -79.9% |
| Initial JS transfer | 324.3 kB | 119.8 kB | -63.1% |
| Total page transfer | 521.5 kB | 237.4 kB | -54.5% |
| Lighthouse unused JS estimate | 226.3 kB | 0 kB | eliminated on tested route |

## Client bundle baseline and result

The baseline build transformed 3,225 modules into one `1,086.6 kB` JS file (`323.6 kB` gzip, `269.9 kB` Brotli) plus `64.7 kB` CSS (`11.9 kB` gzip). The visualizer confirmed that the calendar/Moment, charting, admin, and staff code all entered that public bundle.

The optimized build transforms 2,868 modules and emits route chunks. The complete set of emitted JS/CSS is `1,186.8 kB` raw (`366.3 kB` gzip, `316.8 kB` Brotli), but it is intentionally not downloaded together. The small increase in all-route output includes TanStack Query and chunk boundaries; the meaningful user-facing number is the initial-route transfer, which fell 63.1%.

Largest deferred chunks:

| Chunk | Raw | Gzip | Loaded by landing page? |
| --- | ---: | ---: | --- |
| Recharts/D3 | 378.7 kB | 106.0 kB | No; admin dashboard only |
| React Big Calendar/Moment | 213.9 kB | 67.3 kB | No; calendar routes only |
| React vendor | 180.1 kB | 58.7 kB | Yes; shared runtime |
| TanStack Query | 42.2 kB | 12.2 kB | Yes; shared request cache |
| Landing route | 22.1 kB | 6.2 kB | Yes |

The initial CSS is now `53.6 kB` raw / `9.7 kB` gzip. Calendar CSS (`10.9 kB`) is deferred with calendar routes. Tailwind's `content` configuration already covers `index.html` and every JS/TS/JSX/TSX file under `src`, so production builds strip unused utilities.

Reproduce with:

```text
cd client
npm run analyze
npm run measure:bundle
```

`npm run analyze` writes `dist/bundle-report.html` using `rollup-plugin-visualizer`.

## Lighthouse and Web Vitals

Both runs used Lighthouse's mobile throttling against `vite preview`. The LCP hero is preloaded, eager, high priority, responsive, and has explicit dimensions. Portfolio/staff images use Cloudinary `f_auto,q_auto`, responsive width variants, explicit dimensions, async decoding, lazy loading below the fold, and a low-resolution blurred Cloudinary placeholder. Remote font CSS was removed from the critical path in favor of the configured system fallbacks. API, Cloudinary, and hero-image origins are preconnected.

INP cannot be measured reliably from a lab navigation. The 3 ms median TBT result and memoized calendar transforms indicate ample main-thread headroom, but production INP should be collected through real-user monitoring before calling the field target proven.

## API timing

Pre-change production network sample (five sequential GETs from the development workstation):

| Endpoint | p50 | p95 |
| --- | ---: | ---: |
| `GET /services` | 201.9 ms | 493.5 ms |
| `GET /staff` | 151.2 ms | 163.3 ms |

Optimized server, run locally against Atlas (first request / same-process warm request):

| Endpoint | Cold | Warm | Warm improvement |
| --- | ---: | ---: | ---: |
| `GET /services` | 280.6 ms | 4.8 ms | 98.3% |
| `GET /staff` | 225.6 ms | 3.6 ms | 98.4% |
| `GET /portfolio/recent?limit=12` | 231.0 ms | 3.2 ms | 98.6% |
| `GET /appointments/slots` | 261.2 ms | 4.5 ms | 98.3% |

The cold numbers are Atlas network time from a local process. The warm values demonstrate the code-level cache effect; a post-deploy production run is required for a valid production before/after latency comparison. Public responses include ETag, compression where payload size warrants it, and explicit `Cache-Control` with stale-while-revalidate.

Reproduce with a running API:

```text
cd server
npm run profile:api -- http://127.0.0.1:5000/api
```

## MongoDB explains and indexes

The configured Atlas database is small (17 active services, two active staff, and one matching appointment in the sampled ranges), so execution time is currently 0–2 ms. The important change is removal of blocking sorts/collection scans and stable index behavior as data grows.

| Query | Baseline plan | After index | After examined / returned |
| --- | --- | --- | ---: |
| Staff/day availability | `staff_1_dayKey_1`; status/time uncovered | `staff_1_dayKey_1_status_1_startTime_1` | 1 / 1 |
| Admin status/date | single-field status plus blocking `SORT` | `status_1_date_-1` | 1 / 1 |
| Customer history | customer lookup plus blocking `SORT` | `customer_1_date_-1` | 0 / 0 sample |
| Active services by category | collection scan plus `SORT` | `isActive_1_category_1` | 17 / 17 |
| Active staff | `COLLSCAN` | `isActive_1` | 2 / 2 |
| Lowercase unique email | `email_1` | `email_1` | 1 / 1 |

Additional appointment indexes cover staff/date/status, guest phone/date, and general calendar date/time. Redundant single-field appointment and slot-block indexes were removed. The indexes were applied to the configured Atlas database during this work; `npm run indexes:check` now reports no drift for every model.

Use `npm run profile:db` for execution stats. Use `npm run indexes:check` during deployment review and `npm run indexes:apply` only as an explicit migration step.

## Implemented changes

- Lazy/Suspense route splitting for every public, auth, admin, and staff page; dedicated calendar, chart, query, and React vendor chunks.
- Production Terser minification, console/debugger removal, deterministic hashed asset names, CSS splitting, and visualizer output with gzip/Brotli estimates.
- Named Lucide imports retained; unused Framer Motion dependency removed.
- TanStack Query caching/deduplication for public services, staff, portfolio, and slot requests. Axios receives query cancellation signals, so stale slot requests are aborted.
- Public pages render without waiting for `/auth/me`; public-only visits no longer issue that request.
- Memoized auth context callbacks/value and calendar event transformations; debounced admin searches; existing list/gallery pagination retained and server list caps added.
- Cloudinary responsive delivery helpers, LQIP backgrounds, dimensions, lazy/async image behavior, hero preload, and eager transformations for newly uploaded portfolio images.
- `lean()`, projections, and list caps on read-heavy endpoints. Admin customer N+1 counts were replaced with `$lookup`; dashboard and staff overview independent queries now run in parallel/aggregation.
- Availability now reads bookings and blocks once in parallel and computes slots in memory. A 30-second staff/day cache is invalidated on booking, cancellation, status change, and slot-block writes.
- Five-minute bounded LRU caching for services/staff and two-minute portfolio caching, with invalidation on relevant admin/staff writes.
- Compression, strong ETags, response cache headers, Pino request timing, redacted/minimal request logs, and slow-query warnings (default threshold 100 ms).
- Tuned Mongoose pool/timeouts, production `autoIndex: false`, lightweight readiness health endpoint, reconnection logging, and graceful SIGTERM/SIGINT shutdown.
- Email remains outside the response critical path and now retries transient failures with bounded exponential delay. Sharp streaming/re-encoding and Cloudinary eager derivatives are used for uploads.

## Verification

- `client: npm run build` — passed; all route and calendar chunks compiled.
- `server: npm test` — two suites, five tests passed.
- The integration test creates a guest booking in an in-memory MongoDB, verifies the chosen slot becomes unavailable, authenticates as an admin, cancels it, and verifies persisted cancellation.
- Admin calendar and staff schedule event transforms compile as isolated routes; Big Calendar and Moment are absent from the public route transfer.
- `server: npm run indexes:check` — all seven models report no indexes to create or drop.
- Public API smoke profile — all measured endpoints returned HTTP 200 with expected cache headers.

## Trade-offs and risks

- The in-memory LRU is per Node process. This is the lowest-resource choice for one Render instance. If the API scales horizontally, replace it with Redis/Render Key Value or accept per-instance staleness.
- Availability can be stale for at most 30 seconds between out-of-process database writes. All application booking/cancel/status/block writes invalidate it immediately. The booking lock and conflict recheck remain authoritative, so stale display cannot create a double booking.
- Public reference data can be stale in intermediary caches for its declared TTL even after server-memory invalidation. Admin writes invalidate process cache, but cannot purge a browser/CDN response already served.
- List caps protect memory (`1,000` appointments for admin calendar, `500` staff appointments/blocks, `200–500` customer data). A future dataset beyond these caps should move the corresponding UI from local pagination to cursor pagination.
- System font fallbacks remove font downloads and materially improve LCP, but typography can vary slightly by operating system. Self-hosted WOFF2 subsets are the next choice if exact brand typography is mandatory.
- Eager Cloudinary derivatives increase upload-time transformation usage but prevent the first gallery visitor from paying that cost. Existing uploads are not retroactively eager-generated.
- The total emitted build is slightly larger because it now includes TanStack Query and all deferred routes; initial-route transfer, parse, and execution are substantially smaller.

## Manual deployment steps

1. In the Render Static Site dashboard, add `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`. Add `Cache-Control: no-cache` for `/index.html` and `/`. Render supports path-scoped static-site headers and serves Brotli automatically.
2. Keep the SPA rewrite `/* -> /index.html` in place and verify the static publish directory is `client/dist` (or `dist` if the service root is `client`).
3. Set the client build variable `VITE_API_URL` to the final API base URL. The HTML uses the same absolute URL as an early connection hint.
4. On the web service set `NODE_ENV=production`, `MONGODB_MAX_POOL_SIZE=10`, `MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000`, and optionally `SLOW_QUERY_MS=100`. Keep `/health` as Render's health check path.
5. Run `npm run indexes:check` from the `server` directory after pointing at each production/staging Atlas cluster. The currently configured Atlas cluster is already synchronized. Do not enable Mongoose auto-indexing in production.
6. In Atlas, watch connection utilization and slow-query/query-targeting metrics before changing tier. The sampled database is too small to justify a tier upgrade from query load alone.
7. In Cloudinary, allow the width/quality/format transformations used by the client if strict transformations are enabled. For existing portfolio assets, optionally pre-generate 400×500 and 800×1000 fill derivatives; new uploads request them eagerly.
8. Render Free web services spin down after 15 minutes of no inbound traffic and can take about a minute to wake. For production, a paid always-on instance is the reliable fix. A lightweight external health ping can reduce demo cold starts, but it consumes free-instance hours and should not be treated as a production SLA.
9. Do not add Node cluster mode now: request handling is I/O-bound and Render scales by service instances. Revisit worker threads only if Pino timings show Sharp/upload CPU work blocking the event loop.

Render references: [static-site headers](https://render.com/docs/static-site-headers), [static sites and Brotli](https://render.com/docs/static-sites), and [free service spin-down limits](https://render.com/docs/free).
