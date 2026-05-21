// ===============================
// server.js (FIXED)
// ===============================

import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";

import { fileURLToPath } from "url";
import { dirname } from "path";

import authRoutes from "./routes/auth.js";
import bookRoutes from "./routes/books.js";
import cartRoutes from "./routes/cart.js";
import userRoutes from "./routes/users.js";

// ─── __dirname Fix ───────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Fastify App ─────────────────────────────────────────
const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
      },
    },
  },
});

// ─── Plugins ─────────────────────────────────────────────
await app.register(fastifyCors, {
  origin: true,
  credentials: true,
});

await app.register(fastifyCookie);

await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "pageturn-super-secret-change-in-prod",

  cookie: {
    cookieName: "token",
    signed: false,
  },

  sign: {
    expiresIn: "7d",
  },
});

// ─── Auth Middleware ─────────────────────────────────────
app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({
      error: "Unauthorized – please log in.",
    });
  }
});

// ─── Routes ──────────────────────────────────────────────
await app.register(authRoutes, {
  prefix: "/api/auth",
});

await app.register(bookRoutes, {
  prefix: "/api/books",
});

await app.register(cartRoutes, {
  prefix: "/api/cart",
});

await app.register(userRoutes, {
  prefix: "/api/users",
});

// ─── Health Check ────────────────────────────────────────
app.get("/api/health", async () => {
  return {
    status: "ok",
    ts: new Date().toISOString(),
  };
});

// ─── Start Server ────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

try {
  await app.listen({
    port: PORT,
    host: HOST,
  });

  console.log(`🚀 PageTurn API running at http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}