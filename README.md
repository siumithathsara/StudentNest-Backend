# StudentNest 🏠

> Find a boarding near your campus.

StudentNest is a web application that helps university students in Sri Lanka find boarding places (rented rooms) close to their campus. Students search by campus, see the distance and travel time, request a room, and get the owner's contact details after the owner approves. Boarding owners list their places with photos, and an admin approves every account and every listing.

## 🔗 Live demo

| | Link |
|---|---|
| Website (frontend) | https://student-nest-frontend-xi.vercel.app |
| API (backend) | https://student-nest-backend-three.vercel.app/health |
| Frontend repository |https://github.com/siumithathsara/StudentNest-Frontend.git |
| Backend repository | https://github.com/siumithathsara/StudentNest-Backend.git |

## 👤 About

- **Name:** Imakshi Siyumi Thathsara
- **Module / Assignment:**ITS2020 - Rapid Application Development (RAD)   

## 🛠 Tech stack

| Area | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, Redux Toolkit, React Router, Axios, Leaflet (maps) |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | MongoDB Atlas with Mongoose (geospatial `2dsphere` index and `$geoNear` queries) |
| **Authentication** | JWT (access + refresh tokens), bcrypt password hashing, role-based access (Student / Owner / Admin) |
| **Validation and security** | Zod validation, Helmet, rate limiting, CORS allow-list |
| **File storage** | Supabase Storage (boarding photos, uploaded with Multer) |
| **AI** | Google Gemini API (chat assistant) |
| **Email** | Nodemailer with Gmail SMTP |
| **Maps and places** | OpenStreetMap (Nominatim place search through our own API), Leaflet |
| **Hosting** | Vercel (frontend and backend), MongoDB Atlas, Supabase |

## ✨ Features

### For everyone
- Register as a **student** or a **boarding owner**. An **admin approves every account** before it can log in.
- Secure login with JWT (access and refresh tokens), "keep me signed in" and show/hide password
- **Forgot password** by email (a single-use link that expires in 30 minutes)
- In-app **notifications** (bell icon) and **email notifications** for approvals, bookings and cancellations
- **AI chat assistant** (Google Gemini): students can search in plain English, owners and admins get help using the website
- Responsive design for phones, tablets and desktops

### For students
- Find a boarding near a chosen campus, with **distance and walking / vehicle travel-time estimates**
- Filters: distance, rent range, facilities, free rooms only. Sorting: nearest, rent, newest. Pagination.
- Home page shows boardings near the student's saved campus
- Boarding details: photo gallery, facilities, nearby campuses, approximate map location and a **monthly cost calculator**
- **Favorites** and **Compare** (up to 3 boardings side by side)
- **Request a room** with a move-in date and a message (up to 3 pending requests, one active request per boarding)
- **My bookings**: track and cancel requests. After approval, the owner's **phone, email and exact address** appear.

### For boarding owners
- Add, edit and delete boardings: details, rent, rooms, facilities, **location picked on a map** and **photo upload** (photos are compressed in the browser)
- Nearby campuses are shown live while choosing the location
- **Booking requests:** approve, reject or cancel (a reason is required to reject or cancel)
- The number of free rooms updates **atomically**, so a room can never be booked twice. When the last room is taken, the other pending requests are closed automatically.
- A boarding that has pending or approved bookings cannot be deleted

### For admins
- Dashboard with counts and the items waiting for approval
- Approve, reject or suspend user accounts
- Approve or reject boardings
- Manage campuses with a map picker, place search and Google Maps link paste

### Privacy and security
- An owner's contact details and the exact address stay hidden until the owner approves a booking. Before that, only an approximate location is shown.
- Role-based authorization on every route, Zod input validation, Helmet security headers, rate limiting, CORS allow-list
- Passwords are hashed with bcrypt. Password-reset tokens are stored only as hashes.

### Main flow
1. A student and an owner register. The admin approves both accounts.
2. The owner adds a boarding with a map location and photos. The admin approves it.
3. The student searches near their campus, opens the boarding and requests a room.
4. The owner approves the request. The student now sees the owner's contact details and the exact address.

## 🚀 Getting started (backend)

### Requirements

- Node.js 22 or newer
- A **MongoDB Atlas** cluster (or any MongoDB database)
- A **Supabase** project with a **public** Storage bucket for the boarding photos
- Optional: a Google Gemini API key (chat assistant) and a Gmail app password (emails)

### Run it locally

```bash
git clone https://github.com/siumithathsara/StudentNest-Backend.git
cd studentnest-api
npm install
```

Create a file named `.env` in the project root. **Never commit this file.**

```
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173

MONGO_LOCAL_URL=mongodb+srv://<cluster-host>/studentnest
DB_USER=your-database-user
DB_PASSWORD=your-database-password

JWT_SECRET=a-random-string-of-at-least-32-characters
JWT_REFRESH_SECRET=a-different-random-string-of-at-least-32-characters

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-secret-key
SUPABASE_BUCKET=boarding-images
GEO_USER_AGENT=StudentNest (your-email@example.com)

ADMIN_NAME=Platform Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=choose-a-strong-password

# optional
GEMINI_API_KEY=
GEMINI_MODEL=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
```

You can generate each JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create the admin account (only once), then start the server:

```bash
npm run seed:admin
npm run dev
```

The API runs on http://localhost:3000. Open http://localhost:3000/health, it should return `{"status":"ok"}`. All other routes start with `/api/v1`.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | yes | `development` locally, `production` when deployed |
| `PORT` | no | Port of the server (default `3000`) |
| `CLIENT_URL` | yes in production | Address of the frontend, used for CORS and for links in emails. Several addresses can be separated with commas. |
| `MONGO_LOCAL_URL` | yes | MongoDB connection string (without the user and password) |
| `DB_USER`, `DB_PASSWORD` | yes | MongoDB user and password |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | yes | Two different secrets, at least 32 characters each |
| `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET` | yes | Supabase project address, secret key and the public bucket for photos |
| `GEO_USER_AGENT` | yes | Text sent to the OpenStreetMap Nominatim service (its usage policy requires it) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for `seed:admin` | Details of the first admin account |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | no | Chat assistant. Without them, simple questions and keyword search still work. `GEMINI_MODEL` can list several models separated by commas. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | no | Sending emails (password reset and notifications). Without them, emails are skipped. |

The server checks the required variables when it starts and stops with a clear message if something is missing.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server with automatic restart |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm start` | Runs the compiled server |
| `npm run seed:admin` | Creates the first admin account (only if no admin exists) |
| `npm run sync:indexes` | Creates or updates the database indexes |

## ☁️ Deployment

The API is deployed on **Vercel** as a serverless Express app. Set all environment variables in the Vercel project settings, set `NODE_ENV=production` and set `CLIENT_URL` to the deployed frontend address. In MongoDB Atlas, allow connections from anywhere (`0.0.0.0/0`) under Network Access, because Vercel's IP addresses change.

## 🌐 API overview

Base path: `/api/v1`. Every response has the form `{ "message": "...", "data": ... }`. Protected routes need the header `Authorization: Bearer <access token>`.

A health check is available at `GET /health`.

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register as a student or an owner (the account waits for admin approval) |
| POST | `/auth/login` | Public | Log in, returns an access token and a refresh token |
| POST | `/auth/refresh` | Public | Get a new access token with the refresh token |
| POST | `/auth/forgot-password` | Public | Send a password reset link by email |
| POST | `/auth/reset-password` | Public | Set a new password with the reset token |
| GET | `/auth/me` | Logged in | Details of the current user |

### Admin

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/stats` | Admin | Dashboard counts |
| GET | `/admin/users` | Admin | List users (filter by status and role) |
| PATCH | `/admin/users/:id/status` | Admin | Approve, reject or suspend a user |
| GET | `/admin/boardings` | Admin | List boardings (filter by status) |
| PATCH | `/admin/boardings/:id/status` | Admin | Approve or reject a boarding |

### Campuses and places

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/campuses` | Logged in | List all campuses |
| GET | `/campuses/nearby` | Logged in | Campuses near a point |
| POST | `/campuses` | Admin | Create a campus |
| PUT | `/campuses/:id` | Admin | Update a campus |
| DELETE | `/campuses/:id` | Admin | Delete a campus |
| GET | `/geo/search` | Logged in | Place search (OpenStreetMap Nominatim proxy) |
| GET | `/geo/reverse` | Logged in | Address of a map point |

### Boardings

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/boardings/mine` | Owner | The owner's boardings |
| GET | `/boardings/mine/:id` | Owner | One of the owner's boardings (for editing) |
| POST | `/boardings` | Owner | Create a boarding (multipart form with photos) |
| PUT | `/boardings/:id` | Owner | Update a boarding |
| DELETE | `/boardings/:id` | Owner | Delete a boarding (not allowed while it has active bookings) |
| GET | `/boardings` | Student | Search near a campus: radius, rent, facilities, sort, pagination |
| GET | `/boardings/compare` | Student | Details of 2 to 3 boardings side by side |
| GET | `/boardings/:id` | Student | Boarding details. Contact details appear only after an approved booking. |

### Bookings

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/bookings` | Student | Request a room (move-in date and message) |
| GET | `/bookings/mine` | Student | The student's bookings (contact details only when approved) |
| PATCH | `/bookings/:id/cancel` | Student | Cancel a request or a booking |
| GET | `/bookings/received` | Owner | Requests for the owner's boardings, with counts per status |
| PATCH | `/bookings/:id/status` | Owner | Approve, reject or cancel (a reason is required to reject or cancel) |

### Favorites, notifications and chat

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/favorites` | Student | Favorite boardings |
| GET | `/favorites/ids` | Student | Ids of the favorites (for the heart icons) |
| PUT | `/favorites/:boardingId` | Student | Add a favorite |
| DELETE | `/favorites/:boardingId` | Student | Remove a favorite |
| GET | `/notifications` | Logged in | List notifications |
| GET | `/notifications/unread-count` | Logged in | Number of unread notifications |
| PATCH | `/notifications/read-all` | Logged in | Mark all as read |
| PATCH | `/notifications/:id/read` | Logged in | Mark one as read |
| POST | `/chat` | Logged in | Chat assistant (students: boarding search in plain English; owners and admins: help with the website) |

## 🗄 Data model

| Collection | Main fields | Relations |
|---|---|---|
| **User** | name, email, password (hashed), role, status, phone | |
| **Campus** | name, city, location (GeoJSON point, `2dsphere` index) | |
| **Boarding** | title, description, rent, total and available rooms, facilities, photos, location (`2dsphere` index), status | belongs to an **owner** (User) |
| **Booking** | move-in date, message, status, reason | links a **student**, a **boarding** and the **owner**. A unique partial index allows only one active booking per student and boarding. |
| **Favorite** | | links a **student** and a **boarding** |
| **Notification** | type, title, message, link, read | belongs to a **user** |

## 📁 Project structure

```
src/
├── index.ts              # app setup: security, CORS, routes, error handling
├── config/               # database, environment check, Supabase and Gemini clients
├── routes/               # URL → controller (with validation and role checks)
├── controllers/          # request handling (auth, admin, boardings, bookings, chat ...)
├── models/               # Mongoose schemas
├── validators/           # Zod schemas for request bodies and queries
├── middleware/           # authenticate, requireRole, validate, upload, rate limits, errors
├── service/              # email, notifications, photo upload, geocoding, search, AI
├── util/                 # JWT, geo calculations, booking and chat rules
└── scripts/              # seed:admin, sync:indexes
```

The request flow is **route → middleware (auth, role, validation) → controller → model**.