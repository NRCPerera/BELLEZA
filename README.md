# Luxe Salon - Appointment Management System

A full-stack salon appointment management web app with a customer-facing booking system and an admin panel for managing appointments, staff, and services.

## Tech Stack

**Frontend:** React 18 + Vite, React Router v6, TailwindCSS, React Big Calendar, Lucide React, React Hook Form, React Hot Toast

**Backend:** Node.js + Express, MongoDB + Mongoose, JWT Authentication, Nodemailer

## Prerequisites

- **Node.js** v18+ installed
- **MongoDB** running locally on port 27017 (or update `MONGODB_URI` in `.env`)

## Setup Instructions

### 1. Clone and install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure environment variables

Edit `server/.env` with your settings:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/luxe_salon
JWT_SECRET=your_jwt_secret_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=Luxe Salon <your@gmail.com>
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Cloudinary credentials are server-only: do not add them to a `VITE_*` variable or commit them to the client. They are used to securely process staff portfolio uploads and remove files when a staff profile is deactivated.

> **Note:** Email sending is optional. If SMTP credentials are not configured, the app will still work — email sending will fail silently.

### 3. Optional development seed

```bash
cd server
npm run seed
```

Seeding deletes all application data and is deliberately disabled in production. In a development-only server `.env`, set `ALLOW_SEED=true` and provide `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, and a unique `SEED_ADMIN_PASSWORD` of at least 12 characters. No default credentials are included.

### 4. Start both servers

```bash
# Terminal 1 - Start backend
cd server
npm run dev

# Terminal 2 - Start frontend
cd client
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Admin Panel:** http://localhost:5173/admin/login

## Project Structure

```
salon_proj/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── layout/     # Navbar, Footer
│   │   │   └── ui/         # Modal, Spinner, StatusBadge
│   │   ├── context/        # Auth context provider
│   │   ├── pages/
│   │   │   ├── admin/      # Admin panel pages
│   │   │   ├── auth/       # Login, Register pages
│   │   │   └── customer/   # Public/customer pages
│   │   ├── api.js          # Axios API layer
│   │   ├── App.jsx         # Main routing
│   │   └── main.jsx        # Entry point
│   └── index.html
├── server/                 # Node.js + Express backend
│   └── src/
│       ├── models/         # Mongoose models
│       ├── routes/         # Express route handlers
│       ├── middleware/     # JWT auth middleware
│       ├── services/       # Email service
│       ├── index.js        # Server entry point
│       └── seed.js         # Database seeder
└── README.md
```

## Features

### Customer-Facing
- Landing page with hero, services, and team sections
- Services listing grouped by category
- Staff directory with profiles and specialties
- Staff portfolios with Cloudinary-delivered, lazy-loaded galleries and recent work
- 4-step booking wizard (Service → Staff → Date/Time → Confirm)
- My Bookings dashboard with cancel functionality
- JWT-based registration and login

### Admin Panel
- Dashboard with stats and recent appointments
- Calendar view (week/month) with appointment management
- Appointments table with filters (status, staff, date)
- Staff CRUD with working hours management
- Services CRUD with staff assignment
- Customer directory with appointment history

### API Features
- Slot availability engine (checks working hours + existing bookings)
- Email confirmations on booking and status changes
- Role-based access control (customer/admin)
- Staff portfolio uploads: magic-byte validation, 5MB JPG/PNG/WebP limit, EXIF/GPS stripping, Cloudinary storage, upload throttling, and cleanup on staff deactivation
- Input validation with express-validator

## Deploy to Render, MongoDB Atlas, and Cloudinary

Use two Render services from this repository.

| Service | Render type | Root directory | Build command | Start/publish setting |
| --- | --- | --- | --- | --- |
| Client | Static Site | `client` | `npm ci && npm run build` | Publish directory: `dist` |
| API | Web Service | `server` | `npm ci` | Start command: `npm start` |

Set the API health-check path to `/health`. Render supplies `PORT`; do not set a fixed production port.

For the API, configure `NODE_ENV=production`, `MONGODB_URI`, a long random `JWT_SECRET`, `CLIENT_URL=https://www.example.com`, `COOKIE_DOMAIN=.example.com`, `COOKIE_SAME_SITE=lax`, Cloudinary credentials, `EMAIL_FROM`, and `RESEND_API_KEY`. SMTP values are optional and only used when Resend is not configured. For the static site, set `VITE_API_URL=https://api.example.com/api` before each build.

In Atlas, create a database user with only the needed database permissions, then place its SRV connection string in `MONGODB_URI`. In Atlas Network Access, allow Render egress IP ranges where your plan supports fixed egress; otherwise temporarily allow `0.0.0.0/0` with a strong database password and least-privilege user, then tighten access when fixed egress is available.

Add `www.example.com` as the static site's custom domain and `api.example.com` as the web service's custom domain in Render. At your DNS provider, create the CNAME records Render provides for both names, wait for verification/TLS provisioning, then update `CLIENT_URL`, `COOKIE_DOMAIN`, and `VITE_API_URL` to the final domains. The client `public/_redirects` file rewrites unknown paths to `index.html`, so React Router works on refresh.

Create a GitHub repository secret named `MONGODB_BACKUP_URI` with a backup-capable Atlas connection string. The scheduled [MongoDB backup workflow](.github/workflows/mongodb-backup.yml) runs `mongodump` daily and retains its compressed GitHub Actions artifact for 30 days. For longer retention or disaster recovery requirements, copy the archive to an access-controlled object-storage bucket.
