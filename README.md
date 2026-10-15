# Belleza Salon Appointment Management System

A full-stack salon website with public guest booking, booking-reference tracking, an administration panel, and a self-service staff portal.

## Tech Stack

- **Frontend:** React 18, Vite 5, React Router 7, Tailwind CSS, TanStack Query, Axios, React Hook Form, React Big Calendar, Recharts, Lucide React, and React Hot Toast
- **Backend:** Node.js, Express 4, MongoDB, Mongoose, Zod, and express-validator
- **Media and email:** Cloudinary, Sharp, and Resend
- **Security and operations:** JWT-backed HTTP-only cookie sessions, CSRF protection, Helmet, rate limiting, request sanitization, Pino logging, compression, and in-memory response caching
- **Testing:** Jest, Supertest, and MongoDB Memory Server

## Features

### Public Website and Guest Booking

- Responsive landing page with featured services, team members, contact details, opening hours, and recent work
- Categorized service catalogue with prices, durations, descriptions, and assigned stylists
- Staff directory and individual staff profiles with specialties, working hours, and paginated portfolios
- Photo and short-video portfolio galleries with media filters, lazy loading, poster images, and a lightbox/player
- Four-step guest booking flow: service, stylist, date/time, and confirmation
- Staff-aware service filtering and service-aware stylist filtering, including direct booking links for a selected stylist
- Live 30-minute slot availability based on service duration, staff working hours, existing appointments, elapsed times, and admin booking pauses
- Guest checkout using a Sri Lankan mobile number, with optional email and appointment notes; customer registration is not required
- Concurrency-safe appointment creation to prevent overlapping or double-booked slots
- Unique booking references and a public, view-only tracking link with masked contact information
- Optional Resend confirmation and status-update emails containing booking details and the tracking link
- Booking changes and cancellations are handled by the salon; the public tracking page is intentionally view-only

### Staff Portal

- Role-protected dashboard with today's schedule, upcoming appointment count, and completion/cancellation statistics
- Week/day appointment calendar and a filterable appointment list
- Appointment details and controlled status transitions: confirm, complete, or mark as no-show
- Editable public bio, service assignments, and profile photo; configured working hours are visible to the staff member
- Portfolio management for up to 30 combined photos and videos
- Drag-and-drop multi-file uploads and ordering, upload progress, photo/video filters, captions, previews, and deletion
- JPG, PNG, and WebP photos up to 5 MB; MP4, WebM, and MOV videos up to 50 MB and 90 seconds; up to 10 files per upload
- Password changes and mandatory first-login password reset for provisioned staff accounts

### Admin Panel

- Dashboard metrics for bookings, customers, services, and staff, plus seven-day booking trends, popular services, and recent appointments
- Month/week/day appointment calendar with appointment details, status updates, and booking-pause overlays
- Searchable, paginated appointment table with status, staff, and date filters
- Appointment status management and cancellation
- Salon-wide or staff-specific online-booking pauses for a full day or time range, with an optional reason and resume action
- Staff create/edit/deactivate workflows, service assignment, weekly working-hours management, and linked login provisioning with a temporary password
- Service create/edit/deactivate workflows with duration, price, category, description, and staff assignment
- Searchable customer directory grouped from guest bookings by mobile number, with legacy customer support and appointment history

### API, Security, and Operations

- Role-based access control for administrator and staff routes
- Eight-hour JWT sessions stored in secure, HTTP-only cookies, CSRF tokens on state-changing requests, logout session invalidation, and forced password changes
- Strong password policy for password changes, login throttling, temporary account lockout, and bcrypt cost upgrades
- Global and route-specific rate limits, MongoDB operator rejection/sanitization, HTTP parameter-pollution protection, strict CORS, security headers, body-size limits, and production-safe error responses
- Audit logging for authentication and administrative changes
- Magic-byte media validation instead of trusting file extensions or MIME headers
- Image auto-rotation, resize, WebP conversion, and EXIF/GPS removal; optimized Cloudinary delivery and video poster generation
- Ownership checks on staff appointments, profiles, and portfolio media
- Cached public services, staff, portfolio, and availability responses with invalidation after changes
- Database indexes, index inspection/apply scripts, slow-query logging, API/database profiling scripts, structured request logs, health endpoints, and graceful shutdown
- Soft deactivation for services and staff, including Cloudinary portfolio cleanup when a staff profile is deactivated

## Prerequisites

- Node.js 18 or newer
- MongoDB locally or a MongoDB Atlas connection string
- Cloudinary credentials to upload staff avatars and portfolio media
- A Resend API key and verified sender if email notifications are required

## Local Setup

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure the server

Create `server/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/luxe_salon
MONGODB_MAX_POOL_SIZE=10
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
JWT_SECRET=replace_with_a_random_secret_of_at_least_32_characters
CLIENT_URL=http://localhost:5173
COOKIE_DOMAIN=
COOKIE_SAME_SITE=lax

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Belleza Salon <bookings@your-verified-domain.example>

LOG_LEVEL=debug
SLOW_QUERY_MS=100
```

`MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL` are required. Email is optional: when both `RESEND_API_KEY` and `EMAIL_FROM` are omitted, bookings continue to work and email delivery is skipped. Keep Cloudinary credentials on the server and never expose them through `VITE_*` variables.

The client uses `/api` by default. Vite proxies that path to the local server during development, and Render proxies it to the deployed API in production.

### 3. Optional development seed

The seed deletes all application data and is disabled in production. Add these values to `server/.env` before running it:

```env
ALLOW_SEED=true
SEED_ADMIN_NAME=Administrator
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=a_unique_password_of_at_least_12_characters
SEED_ADMIN_PHONE=
SEED_PRIYANANDA_PASSWORD=a_unique_password_of_at_least_8_characters
SEED_SASANKA_PASSWORD=a_unique_password_of_at_least_8_characters
```

Then run:

```bash
cd server
npm run seed
```

The two seeded staff users are `priyananda@belleza.lk` and `sasanka.prabath@belleza.lk`. Both must change their password on first login.

### 4. Start the application

```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:5000/api>
- Health check: <http://localhost:5000/health>
- Staff/admin sign-in: <http://localhost:5173/admin/login>

## Useful Commands

Run commands from the directory shown:

| Directory | Command | Purpose |
| --- | --- | --- |
| `client` | `npm run dev` | Start the Vite development server |
| `client` | `npm run build` | Create a production build |
| `client` | `npm run preview` | Preview the production build |
| `client` | `npm run measure:bundle` | Build and report bundle sizes |
| `server` | `npm run dev` | Start the API with Nodemon |
| `server` | `npm start` | Start the API with Node.js |
| `server` | `npm test` | Run the Jest/Supertest suite |
| `server` | `npm run indexes:check` | Show differences between declared and database indexes |
| `server` | `npm run indexes:apply` | Synchronize database indexes; review output first |
| `server` | `npm run profile:db` | Profile representative MongoDB queries |
| `server` | `npm run profile:api -- <api-base-url>` | Profile public API response times, caching, and compression |

## Project Structure

```text
BELLEZA/
|-- client/
|   |-- public/                 # Static assets and SPA redirect rule
|   |-- scripts/                # Bundle measurement
|   `-- src/
|       |-- components/         # Layout and reusable UI components
|       |-- context/            # Authentication state
|       |-- hooks/              # Shared React hooks
|       |-- pages/
|       |   |-- admin/          # Administration panel
|       |   |-- auth/           # Portal login and password change
|       |   |-- customer/       # Public pages, booking, and tracking
|       |   `-- staff/          # Staff dashboard and self-service tools
|       |-- api.js              # Axios API client and CSRF handling
|       `-- App.jsx             # Routes and authorization gates
|-- server/
|   |-- scripts/                # Index and performance utilities
|   `-- src/
|       |-- config/             # Validated environment configuration
|       |-- middleware/         # Authentication, security, and uploads
|       |-- models/             # Mongoose models and indexes
|       |-- routes/             # Public, staff, and admin API routes
|       |-- services/           # Cache, email, Cloudinary, audit, and logging
|       |-- index.js            # API entry point
|       `-- seed.js             # Destructive development seed
`-- README.md
```

## Production Deployment (Render, Atlas, and Cloudinary)

Create two Render services from this repository:

| Service | Render type | Root directory | Build command | Start/publish setting |
| --- | --- | --- | --- | --- |
| Client | Static Site | `client` | `npm ci && npm run build` | Publish directory: `dist` |
| API | Web Service | `server` | `npm ci` | Start command: `npm start` |

Set the API health-check path to `/health`. Render supplies `PORT`, so a fixed production value is unnecessary.

For the API, configure `NODE_ENV=production`, `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, the final `CLIENT_URL`, the Cloudinary variables, and—when email is enabled—both `RESEND_API_KEY` and `EMAIL_FROM`. Keep `COOKIE_DOMAIN` empty and set `COOKIE_SAME_SITE=lax`. The static site's first `_redirects` rule proxies `/api/*` to the API service, so keep `VITE_API_URL=/api`. This same-origin route prevents browsers from treating the session as a third-party cookie. Keep the `/api/*` rule before the React Router fallback rule.

If the API service URL changes, update `client/public/_redirects` and redeploy the client. In the Render dashboard, verify that the static site's redirects/rewrites list contains these rules in this order:

| Source | Destination | Action |
| --- | --- | --- |
| `/api/*` | `https://belleza-lq1z.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

In Atlas, create a least-privilege database user and restrict network access to the API service where possible. Production disables automatic index creation; review `npm run indexes:check`, then run `npm run indexes:apply` during a controlled deployment when indexes change.

Add the client and API custom domains in Render, update `CLIENT_URL`, `COOKIE_DOMAIN`, and `VITE_API_URL`, and redeploy. The client's `public/_redirects` rule sends unknown routes to `index.html`, allowing React Router routes to load directly.

Database backups are not automated by this repository. Configure Atlas backups or a separate scheduled `mongodump` process with encrypted, access-controlled retention and regularly test restores.
