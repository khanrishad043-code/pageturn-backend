/**
 * routes/books.js
 *
 * GET /api/books              – list all (supports ?genre=&search=&sort=)
 * GET /api/books/genres       – distinct genres
 * GET /api/books/:id          – single book
 */

import { booksDb } from '../db/store.js';

export default async function bookRoutes(app) {
  // ── List / Search / Filter ────────────────────────────────────────────────
  app.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            genre:  { type: 'string' },
            search: { type: 'string' },
            sort:   { type: 'string', enum: ['price_asc', 'price_desc', 'rating'] },
          },
        },
      },
    },
    async (request) => {
      const { genre, search, sort } = request.query;
      const books = booksDb.all({ genre, search, sort });
      return { count: books.length, books };
    },
  );

  // ── Genres list ───────────────────────────────────────────────────────────
  app.get('/genres', async () => ({ genres: booksDb.genres() }));

  // ── Single book ───────────────────────────────────────────────────────────
  app.get('/:id', async (request, reply) => {
    const book = booksDb.findById(request.params.id);
    if (!book) return reply.code(404).send({ error: 'Book not found.' });
    return book;
  });
}
