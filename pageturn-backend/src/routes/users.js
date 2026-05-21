/**
 * routes/users.js  (all protected)
 *
 * GET   /api/users/profile        – get own profile
 * PATCH /api/users/profile        – update name / password
 * GET   /api/users/orders         – own order history
 * GET   /api/users/orders/:id     – single order detail
 */

import bcrypt from 'bcrypt';
import { usersDb, ordersDb } from '../db/store.js';

const SALT_ROUNDS = 10;

export default async function userRoutes(app) {
  const guard = { preHandler: [app.authenticate] };

  // ── Get profile ───────────────────────────────────────────────────────────
  app.get('/profile', guard, async (request, reply) => {
    const user = usersDb.findById(request.user.sub);
    if (!user) return reply.code(404).send({ error: 'User not found.' });
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  });

  // ── Update profile ────────────────────────────────────────────────────────
  app.patch(
    '/profile',
    {
      ...guard,
      schema: {
        body: {
          type: 'object',
          properties: {
            name:        { type: 'string', minLength: 1 },
            newPassword: { type: 'string', minLength: 6 },
            oldPassword: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const user = usersDb.findById(userId);
      if (!user) return reply.code(404).send({ error: 'User not found.' });

      const patch = {};

      if (request.body.name) {
        patch.name = request.body.name.trim();
      }

      if (request.body.newPassword) {
        // Require old password for password changes
        if (!request.body.oldPassword) {
          return reply.code(400).send({ error: 'Provide your current password to change it.' });
        }
        const valid = await bcrypt.compare(request.body.oldPassword, user.passwordHash);
        if (!valid) {
          return reply.code(401).send({ error: 'Current password is incorrect.' });
        }
        patch.passwordHash = await bcrypt.hash(request.body.newPassword, SALT_ROUNDS);
      }

      if (Object.keys(patch).length === 0) {
        return reply.code(400).send({ error: 'Nothing to update.' });
      }

      const updated = usersDb.update(user.email, patch);
      return { id: updated.id, name: updated.name, email: updated.email };
    },
  );

  // ── Order history ─────────────────────────────────────────────────────────
  app.get('/orders', guard, async (request) => {
    const orders = ordersDb.forUser(request.user.sub);
    return { count: orders.length, orders };
  });

  // ── Single order ──────────────────────────────────────────────────────────
  app.get('/orders/:id', guard, async (request, reply) => {
    const order = ordersDb.findById(request.params.id);
    if (!order) return reply.code(404).send({ error: 'Order not found.' });
    if (order.userId !== request.user.sub) {
      return reply.code(403).send({ error: 'Forbidden.' });
    }
    return order;
  });
}
