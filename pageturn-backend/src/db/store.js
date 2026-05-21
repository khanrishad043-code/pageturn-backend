/**
 * db/store.js
 *
 * Lightweight in-memory store.  Every collection is a plain Map so you can
 * swap this file for a real database adapter (SQLite, Postgres, MongoDB…)
 * without touching any route code.
 *
 * Shape
 * ─────
 * users   : Map<email, { id, name, email, passwordHash, createdAt }>
 * carts   : Map<userId, CartItem[]>   CartItem = { bookId, qty }
 * orders  : Map<orderId, Order>
 */

// ─── Users ─────────────────────────────────────────────────────────────────
const users = new Map();

export const usersDb = {
  findByEmail: (email) => users.get(email.toLowerCase()) ?? null,

  findById: (id) => {
    for (const u of users.values()) if (u.id === id) return u;
    return null;
  },

  create: (user) => {
    users.set(user.email, user);
    return user;
  },

  update: (email, patch) => {
    const existing = users.get(email);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    users.set(email, updated);
    return updated;
  },

  all: () => [...users.values()],
};

// ─── Carts ─────────────────────────────────────────────────────────────────
const carts = new Map();

export const cartsDb = {
  get: (userId) => carts.get(userId) ?? [],

  upsertItem: (userId, bookId, qty) => {
    const items = carts.get(userId) ?? [];
    const idx = items.findIndex((i) => i.bookId === bookId);
    if (qty <= 0) {
      if (idx !== -1) items.splice(idx, 1);
    } else if (idx === -1) {
      items.push({ bookId, qty });
    } else {
      items[idx].qty = qty;
    }
    carts.set(userId, items);
    return items;
  },

  removeItem: (userId, bookId) => {
    const items = (carts.get(userId) ?? []).filter((i) => i.bookId !== bookId);
    carts.set(userId, items);
    return items;
  },

  clear: (userId) => {
    carts.set(userId, []);
  },
};

// ─── Books catalogue (seed data) ───────────────────────────────────────────
const booksMap = new Map();

const seedBooks = [
  {
    id: 'b1',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    genre: 'Fiction',
    price: 14.99,
    cover: 'https://covers.openlibrary.org/b/id/10909258-L.jpg',
    rating: 4.4,
    stock: 12,
    description:
      'Between life and death there is a library, and within that library the shelves go on forever.',
  },
  {
    id: 'b2',
    title: 'Atomic Habits',
    author: 'James Clear',
    genre: 'Self-Help',
    price: 16.99,
    cover: 'https://covers.openlibrary.org/b/id/10521270-L.jpg',
    rating: 4.8,
    stock: 30,
    description: 'Tiny changes, remarkable results – a proven framework for building good habits.',
  },
  {
    id: 'b3',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    genre: 'Sci-Fi',
    price: 15.49,
    cover: 'https://covers.openlibrary.org/b/id/12220422-L.jpg',
    rating: 4.9,
    stock: 8,
    description:
      'A lone astronaut must save Earth from a catastrophic threat while on a solo mission in deep space.',
  },
  {
    id: 'b4',
    title: 'Educated',
    author: 'Tara Westover',
    genre: 'Memoir',
    price: 13.99,
    cover: 'https://covers.openlibrary.org/b/id/8739161-L.jpg',
    rating: 4.7,
    stock: 15,
    description: 'A memoir about a young woman who leaves her survivalist family to educate herself.',
  },
  {
    id: 'b5',
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    genre: 'Fiction',
    price: 12.99,
    cover: 'https://covers.openlibrary.org/b/id/8326867-L.jpg',
    rating: 4.6,
    stock: 20,
    description: 'A philosophical novel about a shepherd journey to find treasure.',
  },
  {
    id: 'b6',
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    genre: 'History',
    price: 17.99,
    cover: 'https://covers.openlibrary.org/b/id/8457884-L.jpg',
    rating: 4.5,
    stock: 25,
    description: 'A brief history of humankind from the Stone Age to the modern era.',
  },
];

seedBooks.forEach((b) => booksMap.set(b.id, b));

export const booksDb = {
  all: ({ genre, search, sort } = {}) => {
    let list = [...booksMap.values()];
    if (genre) list = list.filter((b) => b.genre.toLowerCase() === genre.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
      );
    }
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  },

  findById: (id) => booksMap.get(id) ?? null,

  genres: () => [...new Set([...booksMap.values()].map((b) => b.genre))].sort(),
};

// ─── Orders ────────────────────────────────────────────────────────────────
const orders = new Map();
let orderSeq = 1;

export const ordersDb = {
  create: (userId, items, total) => {
    const id = `ORD-${String(orderSeq++).padStart(5, '0')}`;
    const order = { id, userId, items, total, createdAt: new Date().toISOString() };
    orders.set(id, order);
    return order;
  },

  forUser: (userId) => [...orders.values()].filter((o) => o.userId === userId),

  findById: (id) => orders.get(id) ?? null,
};
