/**
 * routes/auth.js
 *
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me         (protected)
 */

import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { usersDb } from '../db/store.js';

const SALT_ROUNDS = 10;

// tiny helper – crypto.randomUUID is built-in from Node 14.17
const newId = () => crypto.randomUUID();

export default async function authRoutes(app) {
  // ── Register ──────────────────────────────────────────────────────────────
  app.post(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name:     { type: 'string', minLength: 1 },
            email:    { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body;
      const normalizedEmail = email.trim().toLowerCase();

      if (usersDb.findByEmail(normalizedEmail)) {
        return reply.code(409).send({ error: 'Email already registered. Please log in.' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = usersDb.create({
        id: newId(),
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        createdAt: new Date().toISOString(),
      });

      const token = app.jwt.sign({ sub: user.id, email: user.email, name: user.name });

      reply
        .cookie('token', token, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
        .code(201)
        .send({
          message: 'Registration successful.',
          user: { id: user.id, name: user.name, email: user.email },
          token,
        });
    },
  );

  // ── Login ─────────────────────────────────────────────────────────────────
  app.post(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const normalizedEmail = email.trim().toLowerCase();

      const user = usersDb.findByEmail(normalizedEmail);
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials.' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid credentials.' });
      }

      const token = app.jwt.sign({ sub: user.id, email: user.email, name: user.name });

      reply
        .cookie('token', token, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        })
        .send({
          message: 'Login successful.',
          user: { id: user.id, name: user.name, email: user.email },
          token,
        });
    },
  );

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post('/logout', async (_req, reply) => {
    reply.clearCookie('token', { path: '/' }).send({ message: 'Logged out.' });
  });

  // ── Me (current user) ─────────────────────────────────────────────────────
  app.get(
    '/me',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = usersDb.findById(request.user.sub);
      if (!user) return reply.code(404).send({ error: 'User not found.' });
      reply.send({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
    },
  );
}
