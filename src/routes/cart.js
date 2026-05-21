/**
 * routes/cart.js  (all routes are protected)
 *
 * GET    /api/cart            – view cart (items enriched with book data)
 * PUT    /api/cart/items      – add or update an item  { bookId, qty }
 * DELETE /api/cart/items/:id  – remove an item
 * POST   /api/cart/checkout   – place order & clear cart
 */

import { cartsDb, booksDb, ordersDb } from '../db/store.js';

const auth = { preHandler: [(req, rep, done) => req.server.authenticate(req, rep, done)] };

export default async function cartRoutes(app) {
  const guard = { preHandler: [app.authenticate] };

  // Helper – enrich cart items with book details
  function enrichCart(userId) {
    const items = cartsDb.get(userId);
    let subtotal = 0;
    const enriched = items.map((item) => {
      const book = booksDb.findById(item.bookId);
      const lineTotal = book ? +(book.price * item.qty).toFixed(2) : 0;
      subtotal += lineTotal;
      return { bookId: item.bookId, qty: item.qty, book: book ?? null, lineTotal };
    });
    return { items: enriched, subtotal: +subtotal.toFixed(2), count: items.length };
  }

  // ── View cart ─────────────────────────────────────────────────────────────
  app.get('/', guard, async (request) => enrichCart(request.user.sub));

  // ── Add / update item ─────────────────────────────────────────────────────
  app.put(
    '/items',
    {
      ...guard,
      schema: {
        body: {
          type: 'object',
          required: ['bookId', 'qty'],
          properties: {
            bookId: { type: 'string' },
            qty:    { type: 'integer', minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const { bookId, qty } = request.body;
      const userId = request.user.sub;

      const book = booksDb.findById(bookId);
      if (!book) return reply.code(404).send({ error: 'Book not found.' });
      if (qty > book.stock) {
        return reply.code(400).send({ error: `Only ${book.stock} in stock.` });
      }

      cartsDb.upsertItem(userId, bookId, qty);
      return enrichCart(userId);
    },
  );

  // ── Remove item ───────────────────────────────────────────────────────────
  app.delete('/items/:bookId', guard, async (request) => {
    const { bookId } = request.params;
    const userId = request.user.sub;
    cartsDb.removeItem(userId, bookId);
    return enrichCart(userId);
  });

  // ── Checkout ──────────────────────────────────────────────────────────────
  app.post('/checkout', guard, async (request, reply) => {
    const userId = request.user.sub;
    const { items, subtotal } = enrichCart(userId);

    if (items.length === 0) {
      return reply.code(400).send({ error: 'Your cart is empty.' });
    }

    // Stock validation
    for (const item of items) {
      if (!item.book) return reply.code(400).send({ error: `Unknown book ${item.bookId}.` });
      if (item.qty > item.book.stock) {
        return reply
          .code(400)
          .send({ error: `"${item.book.title}" has only ${item.book.stock} left in stock.` });
      }
    }

    // Deduct stock (in-memory)
    items.forEach(({ book, qty }) => {
      book.stock -= qty;
    });

    const order = ordersDb.create(userId, items, subtotal);
    cartsDb.clear(userId);

    return { message: 'Order placed successfully!', order };
  });
}
