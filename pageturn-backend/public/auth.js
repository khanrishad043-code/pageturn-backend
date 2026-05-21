/**
 * auth.js  –  PageTurn frontend auth helpers
 *
 * All user state is now stored server-side (JWT in an httpOnly cookie).
 * We also keep a lightweight { name, email } object in sessionStorage so
 * the UI can display the user's name without an extra API round-trip.
 */

const API = '/api';
const USER_KEY = 'pt_user'; // sessionStorage key (non-sensitive display data only)

// ─── Helpers ────────────────────────────────────────────────────────────────

function setSessionUser(user) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSessionUser() {
  sessionStorage.removeItem(USER_KEY);
}

function getSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `message ${type}`;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include', // send/receive the httpOnly cookie
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ─── Auth guards ─────────────────────────────────────────────────────────────

/**
 * Call on login.html / register.html.
 * If already authenticated, bounce straight to the bookstore.
 */
async function redirectIfLoggedIn() {
  // Fast path: session flag set → redirect immediately
  if (getSessionUser()) {
    window.location.href = 'index.html';
    return;
  }
  // Verify with the server (cookie may still be valid from a previous session)
  const { ok, data } = await apiFetch('/auth/me');
  if (ok) {
    setSessionUser({ name: data.name, email: data.email });
    window.location.href = 'index.html';
  }
}

/**
 * Call on protected pages (index.html).
 * Redirects to login if not authenticated.
 */
async function ensureLoggedIn() {
  if (getSessionUser()) return; // fast path

  const { ok, data } = await apiFetch('/auth/me');
  if (!ok) {
    clearSessionUser();
    window.location.href = 'login.html';
    return;
  }
  setSessionUser({ name: data.name, email: data.email });
}

/**
 * Returns the cached session user or null (sync – no network call).
 */
function getCurrentUser() {
  return getSessionUser();
}

// ─── Register ────────────────────────────────────────────────────────────────

async function handleRegister(event) {
  event.preventDefault();

  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const msg      = document.getElementById('registerMessage');

  if (!name || !email || !password) {
    showMessage(msg, 'Please fill all fields.', 'error');
    return;
  }
  if (password.length < 6) {
    showMessage(msg, 'Password must be at least 6 characters.', 'error');
    return;
  }

  showMessage(msg, 'Creating account…', '');

  const { ok, data } = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  if (!ok) {
    showMessage(msg, data.error || 'Registration failed.', 'error');
    return;
  }

  setSessionUser({ name: data.user.name, email: data.user.email });
  showMessage(msg, 'Registration successful. Redirecting…', 'success');
  setTimeout(() => (window.location.href = 'index.html'), 600);
}

// ─── Login ───────────────────────────────────────────────────────────────────

async function handleLogin(event) {
  event.preventDefault();

  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const msg      = document.getElementById('loginMessage');

  if (!email || !password) {
    showMessage(msg, 'Enter email and password.', 'error');
    return;
  }

  showMessage(msg, 'Signing in…', '');

  const { ok, data } = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!ok) {
    showMessage(msg, data.error || 'Login failed.', 'error');
    return;
  }

  setSessionUser({ name: data.user.name, email: data.user.email });
  showMessage(msg, 'Login successful. Redirecting…', 'success');
  setTimeout(() => (window.location.href = 'index.html'), 500);
}

// ─── Logout ──────────────────────────────────────────────────────────────────

async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  clearSessionUser();
  window.location.href = 'login.html';
}

// ─── Cart helpers (used by index.html) ───────────────────────────────────────

async function getCart() {
  const { ok, data } = await apiFetch('/cart');
  return ok ? data : { items: [], subtotal: 0, count: 0 };
}

async function addToCart(bookId, qty = 1) {
  const { ok, data } = await apiFetch('/cart/items', {
    method: 'PUT',
    body: JSON.stringify({ bookId, qty }),
  });
  return { ok, data };
}

async function removeFromCart(bookId) {
  const { ok, data } = await apiFetch(`/cart/items/${bookId}`, { method: 'DELETE' });
  return { ok, data };
}

async function checkout() {
  const { ok, data } = await apiFetch('/cart/checkout', { method: 'POST' });
  return { ok, data };
}
