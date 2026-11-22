# MERN Blog

A blog platform built with **MongoDB, Express, React and Node.js**: user accounts (email/password, Google, Facebook), role-based access, rich-text posts, comments, an admin panel and real-time notifications.

- **Backend:** REST API (`/api/v1`) in TypeScript with a layered architecture (routes → middleware → controllers → services → models), JWT access + refresh tokens, Zod validation, Mongoose, Socket.io, and 182 Jest tests (97% line coverage).
- **Frontend:** React 19 + TypeScript (Vite), React Router, Context API for auth state, Tailwind CSS, TipTap rich-text editor.

**Demo video:** _add link here_

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [API documentation](#api-documentation)
7. [Real-time notifications](#real-time-notifications)
8. [Testing](#testing)
9. [Design notes](#design-notes)

---

## Features

### Authentication
- **Register, log in, log out** with email and password. Passwords are hashed with **bcrypt** (cost 12).
- **JWT access + refresh tokens.** The short-lived access token (15 min) is sent as `Authorization: Bearer …` and is kept only in memory on the frontend. The refresh token (7 days) lives in an **httpOnly cookie** scoped to `/api/v1/auth`.
- **Refresh-token rotation with reuse detection.** Every refresh replaces the token; only a SHA-256 hash is stored. Presenting an already-replaced token is treated as theft and **revokes every session** of that user. A 30-second grace period lets several tabs refresh at the same moment without logging the user out.
- Up to 5 concurrent sessions per user; logout revokes only the current one.
- **Social login with Google and Facebook** (OAuth 2.0 via Passport). Accounts are linked by email. The OAuth `state` parameter is checked against a cookie (CSRF protection), and the access token is never put in a URL.
- **Rate limiting** on login/register (10 failed attempts per 15 min per IP) and on refresh/logout.
- All secrets come from `.env` and are **validated at startup** with Zod: the server refuses to start with a missing or malformed value.

### Roles and permissions (RBAC)
- Two roles: **user** and **admin**, enforced **by the API** through middleware:
  - `authenticate`: verifies the JWT and re-reads the user, so deactivation and role changes apply immediately.
  - `authorize("admin")`: role check.
  - `checkOwnership(loader)`: owner **or** admin, reused for posts and comments.
- Regular users can create, edit and delete **only their own** posts and comments. Admins can manage everything.
- The frontend mirrors these rules (protected routes, hidden buttons), but the API is the authority.

### Posts
- Full CRUD with **title, rich-text content (HTML), author and timestamps**.
- A **URL-friendly slug** is generated from the title (`Hello, Wörld!` → `hello-world`; duplicates get a random suffix). Posts are reachable by slug or id.
- **Soft delete** (`isDeleted` + `deletedAt`): deleted posts disappear from the site, and admins can restore them or delete them permanently.
- **HTML sanitization**: content is stripped to an allowlist on the server (`sanitize-html`) and again in the browser (DOMPurify), so stored posts can't carry scripts.
- Paginated lists, filterable by author ("My posts").

### Comments
- CRUD nested under posts: `/posts/:postId/comments`, linked to posts and authors with Mongoose references.
- Users edit or delete their own comments; admins can manage all of them.

### Admin panel (`/admin`)
- **Dashboard:** total users, posts (plus the soft-deleted count) and comments, and the latest activity.
- **Users:** search, filter by role, promote/demote, activate/deactivate (logs the user out everywhere), delete. Admins can't modify their own account.
- **Posts:** all / published / deleted, edit, soft-delete, restore, delete permanently.
- **Comments:** every comment with its author and post, delete.

### Also included
- **Activity log** middleware records logins, sign-ups, post/comment creation, updates and deletions, and admin actions.
- **Real-time notifications** (Socket.io, JWT-authenticated): authors are notified of new comments, admins of new posts, shown as toasts.
- **Centralized error handling:** one response shape for every error (validation, Mongoose, JWT, malformed JSON, 404, 500).
- **Performance:** compound indexes for every list query (verified with `explain()`), pagination everywhere, `populate` limited to the fields needed (`author: name`), `.lean()` reads, parallel count queries.

---

## Tech stack

| Layer | Technologies |
|---|---|
| Backend | Node.js, Express 5, TypeScript, MongoDB + Mongoose, Zod, jsonwebtoken, bcryptjs, Passport (Google, Facebook), express-rate-limit, helmet, sanitize-html, Socket.io |
| Frontend | React 19, TypeScript, Vite, React Router, Axios, Tailwind CSS, TipTap, DOMPurify, socket.io-client |
| Testing | Jest, Supertest, mongodb-memory-server, socket.io-client |

---

## Project structure

```
backend/
├── src/
│   ├── config/        # env validation (Zod), database, Passport strategies
│   ├── routes/        # Express routers, grouped by resource, mounted under /api/v1
│   ├── middleware/    # authenticate, authorize, checkOwnership, validate, rate limiting,
│   │                  # activity logging, centralized error handler
│   ├── controllers/   # HTTP layer only: read the request, call a service, send the response
│   ├── services/      # business logic (auth, posts, comments, admin, notifications)
│   ├── models/        # Mongoose schemas + indexes (User, Post, Comment, ActivityLog)
│   ├── validators/    # Zod request schemas
│   ├── socket/        # Socket.io server + JWT handshake
│   ├── utils/         # ApiError, response helpers, JWT, slugify, pagination, HTML sanitizer
│   ├── scripts/       # seed script
│   ├── app.ts         # Express app (middleware + routes)
│   └── index.ts       # starts HTTP + Socket.io server
└── tests/
    ├── unit/          # utils, middleware, services
    └── integration/   # HTTP API (supertest) + sockets

frontend/src/
├── api/               # Axios client (token refresh/retry) + one module per resource
├── context/           # AuthProvider, ConfirmProvider (modal), ToastProvider
├── hooks/             # useAuth, useApi, useConfirm, useToast, useFormError, useAdminAction
├── components/        # layout, routing guards, editor, posts, comments, admin, ui
├── pages/             # one component per route (admin/ for the admin panel)
└── utils/             # error parsing, formatting, HTML sanitizing, permissions
```

---

## Getting started

### Prerequisites
- **Node.js 20.19+** (developed on Node 24)
- **MongoDB**: a local server (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas connection string

### 1. Install

```bash
git clone <repo-url>
cd mernStackAssignment

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure

```bash
# backend
cd backend
cp .env.example .env
# set MONGODB_URL, and generate two different JWT secrets:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# frontend
cd ../frontend
cp .env.example .env    # defaults work for local development
```

Google/Facebook login is optional; see [Social login setup](#social-login-setup).

### 3. Seed sample data (optional, recommended)

```bash
cd backend
npm run seed            # creates an admin, two users, 4 posts and comments
npm run seed -- --fresh # removes the sample accounts and their content first
```

| Account | Email | Password |
|---|---|---|
| Admin | `admin@example.com` (or `SEED_ADMIN_EMAIL`) | `Admin@12345` (or `SEED_ADMIN_PASSWORD`) |
| User | `alice@example.com` | `Password123` |
| User | `bob@example.com` | `Password123` |

The seed is idempotent. It never modifies data other than these accounts and their content. To make any other account an admin, set its `role` to `"admin"` in the `users` collection.

### 4. Run (development)

Two terminals:

```bash
cd backend && npm run dev     # API + Socket.io on http://localhost:5000
cd frontend && npm run dev    # app on http://localhost:5173
```

Open **http://localhost:5173**. Health check: http://localhost:5000/api/v1/health.

### Production build

```bash
cd backend && npm run build && npm start   # compiled to dist/
cd frontend && npm run build               # static files in dist/, serve with any web server
```

In production, set `NODE_ENV=production` (the refresh cookie then becomes `Secure; SameSite=None`, which requires HTTPS), and set `CLIENT_URL` / `SERVER_URL` / `VITE_API_URL` to the real URLs.

### Scripts

| Backend | |
|---|---|
| `npm run dev` | start with auto-reload (tsx watch) |
| `npm run build` / `npm start` | compile to `dist/` / run the compiled server |
| `npm test` / `npm run test:coverage` | run the test suite / with coverage report (`coverage/`) |
| `npm run typecheck` | type-check source and tests |
| `npm run seed` | seed the admin + sample data |

| Frontend | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` / `npm run preview` | production build / preview it |
| `npm run lint` | ESLint |

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | | `development` | `development`, `production` or `test` |
| `PORT` | | `5000` | API port |
| `MONGODB_URL` | ✔ | | MongoDB connection string |
| `CLIENT_URL` | | `http://localhost:5173` | Frontend origin (CORS, OAuth redirects, Socket.io CORS) |
| `SERVER_URL` | | `http://localhost:5000` | Public API URL, used to build OAuth callback URLs |
| `JWT_ACCESS_SECRET` | ✔ | | Access-token secret, at least 32 characters |
| `JWT_REFRESH_SECRET` | ✔ | | Refresh-token secret, at least 32 characters, **different** from the access secret |
| `JWT_ACCESS_EXPIRES_IN` | | `15m` | Access-token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | | `7d` | Refresh-token lifetime |
| `BCRYPT_SALT_ROUNDS` | | `12` | bcrypt cost factor (4–15) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | | | Enables Google login when both are set |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | | | Enables Facebook login when both are set |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | | see above | Admin created by `npm run seed` |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api/v1` | Backend API base URL |
| `VITE_SOCKET_URL` | origin of `VITE_API_URL` | Socket.io server |

### Social login setup

Leave the variables empty to disable a provider. Its button then returns "not configured".

- **Google:** in the Google Cloud Console → *APIs & Services → Credentials*, create an **OAuth client ID** (Web application). Add the authorized redirect URI `http://localhost:5000/api/v1/auth/google/callback`.
- **Facebook:** at developers.facebook.com create an app and add **Facebook Login**. Add the valid OAuth redirect URI `http://localhost:5000/api/v1/auth/facebook/callback` and request the `email` permission. In development mode only app testers/developers can log in.

---

## API documentation

**Base URL:** `http://localhost:5000/api/v1`. Authenticated requests send `Authorization: Bearer <accessToken>`.

### Response format

```jsonc
// success
{ "success": true, "message": "Post created", "data": { ... }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
// error (meta only on paginated lists, details only on validation errors)
{ "success": false, "message": "Validation failed", "details": [{ "field": "title", "message": "Too small: expected string to have >=3 characters" }] }
```

| Status | Meaning |
|---|---|
| `400` | Validation failed / malformed JSON / invalid id |
| `401` | Missing, invalid or expired token |
| `403` | Authenticated but not allowed (wrong role, not the owner, deactivated account) |
| `404` | Resource or route not found (soft-deleted posts included) |
| `409` | Conflict, e.g. email already registered |
| `429` | Rate limit exceeded |
| `500` | Unexpected error (details are logged, never returned) |

Paginated endpoints accept `?page=` (default 1) and `?limit=` (default 10, max 50).

### Auth: `/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public, rate-limited | Body `{ name, email, password }`. Returns `{ user, accessToken }` and sets the refresh cookie |
| POST | `/auth/login` | Public, rate-limited | Body `{ email, password }`. Same response as register |
| POST | `/auth/refresh` | Refresh cookie | Rotates the refresh token. Returns `{ user, accessToken }` |
| POST | `/auth/logout` | Refresh cookie | Revokes this session and clears the cookie |
| GET | `/auth/me` | User | The authenticated user |
| GET | `/auth/google`, `/auth/facebook` | Public | Starts social login (browser redirect) |
| GET | `/auth/google/callback`, `/auth/facebook/callback` | Provider | Sets the refresh cookie and redirects to `CLIENT_URL/oauth/callback` (or `/login?error=…`) |

### Posts: `/posts`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/posts?page&limit&author` | Public | Published posts, newest first |
| GET | `/posts/:idOrSlug` | Public | One post by id or slug |
| POST | `/posts` | User | Body `{ title, content }` (content is HTML, sanitized) |
| PATCH | `/posts/:id` | Owner or admin | Body `{ title?, content? }`. A new title regenerates the slug |
| DELETE | `/posts/:id` | Owner or admin | Soft delete |

### Comments: `/posts/:postId/comments`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/posts/:postId/comments?page&limit` | Public | Comments of a published post, newest first |
| GET | `/posts/:postId/comments/:id` | Public | One comment |
| POST | `/posts/:postId/comments` | User | Body `{ content }` |
| PATCH | `/posts/:postId/comments/:id` | Owner or admin | Body `{ content }` |
| DELETE | `/posts/:postId/comments/:id` | Owner or admin | Delete |

### Admin: `/admin` (admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | `{ totalUsers, totalPosts, deletedPosts, totalComments, recentActivity }` |
| GET | `/admin/users?page&limit&search&role` | Users (search matches name or email) |
| PATCH | `/admin/users/:id/role` | Body `{ role: "user" \| "admin" }` |
| PATCH | `/admin/users/:id/status` | Body `{ isActive }`. Deactivating revokes all sessions and closes sockets |
| DELETE | `/admin/users/:id` | Deletes the user and their comments, soft-deletes their posts |
| GET | `/admin/posts?page&limit&status` | `status`: `all` (default), `active`, `deleted` |
| PATCH | `/admin/posts/:id/restore` | Restore a soft-deleted post |
| DELETE | `/admin/posts/:id` | Permanently delete a post and its comments |
| GET | `/admin/comments?page&limit` | All comments with author and post |
| DELETE | `/admin/comments/:id` | Delete any comment |

Admins can't change their own role or status, or delete themselves (`400`).

### Health

`GET /health` → `{ status, db, uptime }`

---

## Real-time notifications

Socket.io runs on the same server as the API.

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:5000", { auth: { token: accessToken } });
socket.on("notification", (n) => console.log(n));
// { id, type: "comment.created" | "post.created", message, link: "/posts/<slug>", createdAt }
```

- The handshake is rejected (`connect_error: Unauthorized`) without a valid access token or for a deactivated user. The frontend then refreshes its token and reconnects.
- `comment.created` goes to the post's author (not for their own comments). `post.created` goes to every admin except the author.
- Deactivating or deleting a user disconnects their sockets; role changes update their channels immediately.

---

## Testing

```bash
cd backend
npm test                # 182 tests, about 5 s
npm run test:coverage   # coverage report in backend/coverage/
```

- Each test file runs against its own **in-memory MongoDB** (`mongodb-memory-server`). The first run downloads a MongoDB binary.
- **Unit tests:** slug generation, JWT helpers, the HTML sanitizer, every middleware, and every service (token rotation, reuse detection, grace period, OAuth account linking, slug collisions, soft delete, admin cascades, index usage).
- **Integration tests:** the HTTP API with Supertest (auth, posts, comments, admin, rate limiting, OAuth flow, and role/ownership rules for user, other user and admin) and Socket.io (handshake auth, who receives which notification, sockets following admin actions).
- Coverage: **97.6% lines, 86% branches**.

---

## Design notes

- **Layered backend.** Controllers only translate HTTP; services hold all business rules and never touch `req`/`res`. Middleware is generic and reused, for example `checkOwnership` for both posts and comments, with the loaded document handed to the controller to avoid a second query.
- **Express 5** forwards rejected promises from async handlers to the error handler, so no `asyncHandler` wrapper is needed.
- **Token storage.** The access token stays in memory (not localStorage) to limit XSS exposure; the refresh token is in an httpOnly cookie restricted to the auth routes. The frontend shares a single refresh request between concurrent callers.
- **Stable pagination.** All lists sort by `{ createdAt: -1, _id: -1 }`, and the indexes include `_id`, so items created in the same millisecond never repeat or disappear between pages.
- **API versioning** under `/api/v1`. Validation schemas also sanitize the input (trim, lowercase emails, strip unknown fields, sanitize HTML) before it reaches the services.
