# PageTurn – Fastify Backend

A complete REST API for the PageTurn bookstore frontend, built with **Fastify**, **JWT authentication**, and **bcrypt** password hashing.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (auto-restarts on changes)
npm run dev

# 3. Open the app
open http://localhost:3000
```

Copy your frontend files (`index.html`, `login.html`, `register.html`, `auth.css`, `bookstore.css`) into the **`public/`** folder alongside the updated `auth.js` provided here.

---

## Project Structure

```
pageturn-backend/
├── public/                 ← Frontend files (served as static assets)
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── auth.js             ← Updated version (talks to the API)
│   ├── auth.css
│   └── bookstore.css
│
└── src/
    ├── server.js           ← Fastify app entry point
    ├── db/
    │   └── store.js        ← In-memory data store (swap for real DB here)
    └── routes/
        ├── auth.js         ← /api/auth/*
        ├── books.js        ← /api/books/*
        ├── cart.js         ← /api/cart/*
        └── users.js        ← /api/users/*
```

---

## API Reference

### Auth  `/api/auth`

| Method | Endpoint    | Auth | Body / Params                        | Description              |
|--------|-------------|------|--------------------------------------|--------------------------|
| POST   | /register   | –    | `{ name, email, password }`          | Create account           |
| POST   | /login      | –    | `{ email, password }`                | Login, set cookie        |
| POST   | /logout     | –    | –                                    | Clear session cookie     |
| GET    | /me         | ✅   | –                                    | Current user profile     |

### Books  `/api/books`

| Method | Endpoint      | Auth | Query Params                                       | Description          |
|--------|---------------|------|----------------------------------------------------|----------------------|
| GET    | /             | –    | `?genre=&search=&sort=price_asc\|price_desc\|rating` | List / filter books  |
| GET    | /genres       | –    | –                                                  | All genres           |
| GET    | /:id          | –    | –                                                  | Single book          |

### Cart  `/api/cart`  *(requires login)*

| Method | Endpoint         | Auth | Body / Params                | Description              |
|--------|------------------|------|------------------------------|--------------------------|
| GET    | /                | ✅   | –                            | View cart (enriched)     |
| PUT    | /items           | ✅   | `{ bookId, qty }`            | Add / update item        |
| DELETE | /items/:bookId   | ✅   | –                            | Remove item              |
| POST   | /checkout        | ✅   | –                            | Place order, clear cart  |

### Users  `/api/users`  *(requires login)*

| Method | Endpoint       | Auth | Body                                          | Description          |
|--------|----------------|------|-----------------------------------------------|----------------------|
| GET    | /profile       | ✅   | –                                             | Get profile          |
| PATCH  | /profile       | ✅   | `{ name?, newPassword?, oldPassword? }`       | Update profile       |
| GET    | /orders        | ✅   | –                                             | Order history        |
| GET    | /orders/:id    | ✅   | –                                             | Single order         |

---

## Authentication

- On login/register the server issues a **JWT** stored in an **`httpOnly` cookie** (7-day expiry).
- Protected routes validate the cookie automatically via `@fastify/jwt`.
- The frontend never touches the token directly; it just sends `credentials: 'include'` with every `fetch`.

---

## Environment Variables

| Variable     | Default                               | Description                    |
|--------------|---------------------------------------|--------------------------------|
| `JWT_SECRET` | `pageturn-super-secret-change-in-prod`| JWT signing secret             |
| `PORT`       | `3000`                                | HTTP port                      |
| `HOST`       | `0.0.0.0`                             | Bind address                   |

```bash
JWT_SECRET=my-real-secret PORT=8080 npm start
```

---

## Swapping the Database

All data access is isolated in `src/db/store.js`. Each exported object (`usersDb`, `booksDb`, `cartsDb`, `ordersDb`) exposes a tiny interface. Replace the Map-based implementation with any DB driver (Postgres via `postgres`, SQLite via `better-sqlite3`, MongoDB via `mongoose`, etc.) and nothing else changes.

---

## Production Checklist

- [ ] Set a strong `JWT_SECRET` via environment variable
- [ ] Replace the in-memory store with a persistent database
- [ ] Set `origin` in `@fastify/cors` to your actual frontend domain
- [ ] Enable HTTPS (reverse proxy with nginx / Caddy recommended)
- [ ] Add rate-limiting with `@fastify/rate-limit`
