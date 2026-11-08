// Shared helpers for the Out of Africa API (files starting with _ are not routes).
import SEED from "./_seed.js";

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
export const bad = (msg, status = 400) => json({ error: msg }, status);

export const slugify = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "item";
export const now = () => new Date().toISOString();
export const rid = (n = 10) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join(""); };

/* ------------------------------------------------------------ database */
let ready = false;
export async function db(env) {
  if (!env.DB) throw new Error("Database binding DB is missing");
  if (ready) return env.DB;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS artists (id TEXT PRIMARY KEY, data TEXT NOT NULL, sort INTEGER DEFAULT 0, updated_at TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS artworks (id TEXT PRIMARY KEY, data TEXT NOT NULL, sort INTEGER DEFAULT 0, updated_at TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, name TEXT, email TEXT, data TEXT, status TEXT DEFAULT 'new', notes TEXT DEFAULT '', created_at TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, token TEXT, submission_id INTEGER, status TEXT, data TEXT, created_at TEXT, updated_at TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT, at INTEGER)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS team (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT, pass_hash TEXT NOT NULL, salt TEXT NOT NULL, perms TEXT NOT NULL DEFAULT '{}', expires_at TEXT, active INTEGER DEFAULT 1, session_ver INTEGER DEFAULT 1, created_at TEXT, last_login TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY AUTOINCREMENT, who TEXT, action TEXT, at TEXT)")
  ]);
  const seeded = await env.DB.prepare("SELECT value FROM settings WHERE key = 'site'").first();
  if (!seeded) {
    const stmts = [env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('site', ?)").bind(JSON.stringify(SEED.site))];
    SEED.artists.forEach((a, i) => stmts.push(env.DB.prepare("INSERT OR IGNORE INTO artists (id, data, sort, updated_at) VALUES (?, ?, ?, ?)").bind(a.id, JSON.stringify(a), i, now())));
    SEED.artworks.forEach((w, i) => stmts.push(env.DB.prepare("INSERT OR IGNORE INTO artworks (id, data, sort, updated_at) VALUES (?, ?, ?, ?)").bind(w.id, JSON.stringify(w), i, now())));
    await env.DB.batch(stmts);
  }
  ready = true;
  return env.DB;
}

export async function getSite(DB) {
  const r = await DB.prepare("SELECT value FROM settings WHERE key = 'site'").first();
  return r ? JSON.parse(r.value) : {};
}
export async function list(DB, table) {
  const { results } = await DB.prepare(`SELECT id, data, sort FROM ${table} ORDER BY sort ASC, id ASC`).all();
  return results.map((r) => ({ ...JSON.parse(r.data), id: r.id, sort: r.sort }));
}

/* ------------------------------------------------------------ auth */
const enc = new TextEncoder();
async function key(env) {
  const secret = env.SESSION_SECRET || ("oa-session::" + (env.ADMIN_PASSWORD || ""));
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function makeSession(env, days = 30, who = { u: "owner" }) {
  const payload = b64(enc.encode(JSON.stringify({ exp: Date.now() + days * 864e5, ...who })));
  const sig = b64(await crypto.subtle.sign("HMAC", await key(env), enc.encode(payload)));
  return payload + "." + sig;
}

// The sections a team member can be given. "view" or "edit" (edit includes view).
export const SECTIONS = ["artworks", "artists", "inbox", "orders", "photos", "settings"];
const ALL_EDIT = Object.fromEntries(SECTIONS.map((k) => [k, "edit"]));
export function cleanPerms(p) {
  p = p || {};
  if (p.role === "artist") {
    // Artist login: tied to their own artist profile(s), never sees anyone else's.
    const artists = (Array.isArray(p.artists) ? p.artists : []).map((x) => String(x).slice(0, 80)).filter(Boolean).slice(0, 10);
    return { role: "artist", artists, publish: !!p.publish, prices: !!p.prices, sales: !!p.sales };
  }
  const out = {};
  for (const k of SECTIONS) if (p[k] === "view" || p[k] === "edit") out[k] = p[k];
  return out;
}

// Who is signed in? The owner (master password from Cloudflare) or a team member from the database.
export async function getUser(env, request) {
  if (!env.ADMIN_PASSWORD) return null;
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)oa_session=([^;]+)/);
  if (!m) return null;
  const [payload, sig] = m[1].split(".");
  if (!payload || !sig) return null;
  let data;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(env), unb64(sig), enc.encode(payload));
    if (!ok) return null;
    data = JSON.parse(new TextDecoder().decode(unb64(payload)));
  } catch (e) { return null; }
  if (!data || !(data.exp > Date.now())) return null;
  if (!data.u || data.u === "owner") return { id: "owner", owner: true, name: "Owner", perms: ALL_EDIT };
  const DB = await db(env);
  const r = await DB.prepare("SELECT id, username, name, perms, expires_at, active, session_ver FROM team WHERE id = ?").bind(data.u).first();
  if (!r || !r.active || r.session_ver !== data.v) return null;
  if (r.expires_at && new Date(r.expires_at).getTime() <= Date.now()) return null;
  const perms = cleanPerms(JSON.parse(r.perms || "{}"));
  return { id: r.id, owner: false, artist: perms.role === "artist", username: r.username, name: r.name || r.username, perms, expires_at: r.expires_at };
}
export async function checkSession(env, request) { return !!(await getUser(env, request)); }

export async function hashPassword(password, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 }, base, 256);
  return b64(bits);
}
export async function logActivity(DB, who, action) {
  try {
    await DB.prepare("INSERT INTO activity (who, action, at) VALUES (?, ?, ?)").bind(String(who).slice(0, 80), String(action).slice(0, 240), now()).run();
    if (Math.random() < 0.05) await DB.prepare("DELETE FROM activity WHERE id NOT IN (SELECT id FROM activity ORDER BY id DESC LIMIT 1000)").run();
  } catch (e) {}
}
export const sessionCookie = (value, maxAge) =>
  `oa_session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

export async function safeEqual(a, b) {
  const ha = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(String(a))));
  const hb = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(String(b))));
  let diff = 0; for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

/* ------------------------------------------------------------ sanitising */
const clip = (v, n) => String(v == null ? "" : v).slice(0, n);
export function cleanArtwork(w, id) {
  const status = ["available", "reserved", "sold", "commission"].includes(w.status) ? w.status : "available";
  const price = w.price === "" || w.price === null || w.price === undefined || isNaN(Number(w.price)) ? null : Math.max(0, Number(w.price));
  return {
    id, title: clip(w.title, 140) || "Untitled", artist: clip(w.artist, 80), category: clip(w.category, 60),
    medium: clip(w.medium, 140), dimensions: clip(w.dimensions, 80), weight: clip(w.weight, 40), year: clip(w.year, 20),
    price, status, images: (Array.isArray(w.images) ? w.images : []).slice(0, 12).map((s) => clip(s, 300)),
    alt: clip(w.alt, 220), description: clip(w.description, 3000), story: clip(w.story, 3000), provenance: clip(w.provenance, 800),
    featured: !!w.featured, draft: !!w.draft, added: clip(w.added, 10) || now().slice(0, 10)
  };
}
export function cleanArtist(a, id) {
  const arr = (v, n, m) => (Array.isArray(v) ? v : String(v || "").split("\n")).map((s) => clip(s, m).trim()).filter(Boolean).slice(0, n);
  return {
    id, name: clip(a.name, 100) || "New artist", country: clip(a.country, 60), city: clip(a.city, 60),
    disciplines: arr(a.disciplines, 8, 40), portrait: clip(a.portrait, 300), short: clip(a.short, 400),
    highlights: arr(a.highlights, 10, 300), bio: arr(a.bio, 10, 2000), approach: clip(a.approach, 2000),
    acceptsCommissions: !!a.acceptsCommissions, featured: !!a.featured,
    instagram: clip(a.instagram, 200), facebook: clip(a.facebook, 200)
  };
}

/* ------------------------------------------------------------ approvals */
// A pending change lives on the item as `review` and never reaches the public site.
export const publicItem = (x) => { const { review, ...rest } = x; return rest; };
export async function getRow(DB, table, id) {
  const r = id ? await DB.prepare(`SELECT id, data FROM ${table} WHERE id = ?`).bind(String(id)).first() : null;
  return r ? { ...JSON.parse(r.data), id: r.id } : null;
}
