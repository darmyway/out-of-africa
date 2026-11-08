// Photo uploads from the dashboard (already resized in the browser).
import { json, bad, rid, slugify } from "../../_lib.js";
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function onRequestPost({ request, env }) {
  if (!env.MEDIA) return bad("Photo storage (MEDIA) is not connected yet.", 503);
  const type = (request.headers.get("content-type") || "").split(";")[0];
  if (!TYPES[type]) return bad("Please upload a JPG, PNG or WebP image.");
  const buf = await request.arrayBuffer();
  if (buf.byteLength > 6 * 1024 * 1024) return bad("That photo is too large (max 6 MB).");
  const name = slugify(new URL(request.url).searchParams.get("name") || "photo");
  const key = `${new Date().toISOString().slice(0, 7)}/${name}-${rid(6)}.${TYPES[type]}`;
  await env.MEDIA.put(key, buf, { metadata: { type, size: buf.byteLength, at: Date.now() } });
  return json({ ok: true, url: `/media/${key}` });
}
export async function onRequestGet({ env }) {
  if (!env.MEDIA) return json([]);
  const out = []; let cursor;
  do { const r = await env.MEDIA.list({ cursor, limit: 1000 }); r.keys.forEach((k) => out.push({ url: `/media/${k.name}`, ...(k.metadata || {}) })); cursor = r.list_complete ? null : r.cursor; } while (cursor && out.length < 3000);
  return json(out.sort((a, b) => (b.at || 0) - (a.at || 0)));
}
export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url).searchParams.get("url") || "";
  if (!env.MEDIA || !url.startsWith("/media/")) return bad("Missing photo");
  await env.MEDIA.delete(url.slice(7));
  return json({ ok: true });
}
