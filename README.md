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

### 3. Seed the database

```bash
cd server
npm run seed
```

This creates:
- **Admin user:** `admin@salon.com` / `admin123`
- **Customer users:** `jane@example.com` / `password123`, `sarah@example.com` / `password123`
- 4 staff members, 6 services (Hair, Skin, Nails), and 5 sample appointments

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
