import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import cartRoutes from './routes/cart.js';
import userRoutes from './routes/users.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  },
});

// ─── Plugins ───────────────────────────────────────────────────────────────
await app.register(fastifyCors, {
  origin: true,           // allow all origins – tighten in production
  credentials: true,
});

await app.register(fastifyCookie);

await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'pageturn-super-secret-change-in-prod',
  cookie: { cookieName: 'token', signed: false },
  sign: { expiresIn: '7d' },
});

// Serve the frontend files from the project root's "public" folder
await app.register(fastifyStatic, {
  root: join(__dirname, '..', 'public'),
  prefix: '/',
});

// ─── Auth decorator ────────────────────────────────────────────────────────
/**
 * Adds  app.authenticate  – a preHandler that verifies the JWT from either
 * the Authorization header or the "token" cookie.
 */
app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized – please log in.' });
  }
});

// ─── Routes ────────────────────────────────────────────────────────────────
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(bookRoutes, { prefix: '/api/books' });
await app.register(cartRoutes, { prefix: '/api/cart' });
await app.register(userRoutes, { prefix: '/api/users' });

// Health check
app.get('/api/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// ─── Start ─────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n🚀  PageTurn API running at http://localhost:${PORT}\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
