// Orders: created from checkout requests, turned into quotes, tracked to delivery.
import { json, bad, db, now, rid } from "../../_lib.js";
const STATUSES = ["requested", "quoted", "paid", "shipped", "delivered", "cancelled"];

export async function onRequestGet({ env, data }) {
  const DB = await db(env), u = data.user;
  const { results } = await DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500").all();
  const rows = results.map((r) => ({ ...r, data: JSON.parse(r.data || "{}") }));
  if (!u.artist) return json(rows);
  // Artists see sales of their own works only, with no buyer contact details.
  const works = (await DB.prepare("SELECT id, data FROM artworks").all()).results.filter((w) => u.perms.artists.includes(JSON.parse(w.data).artist)).map((w) => w.id);
  return json(rows.map((o) => {
    const items = (o.data.items || []).filter((i) => works.includes(i.id));
    if (!items.length) return null;
    const country = String((o.data.buyer || {}).address || "").split(",").pop().trim();
    return { id: o.id, status: o.status, created_at: o.created_at, sale: { items: items.map((i) => ({ id: i.id, title: i.title, price: i.price })), currency: o.data.currency || "USD", country } };
  }).filter(Boolean));
}
export async function onRequestPost({ request, env }) {           // create manually (e.g. from an enquiry)
  const b = await request.json(), DB = await db(env);
  const id = "OA-" + rid(6).toUpperCase();
  const data = { buyer: b.buyer || {}, items: b.items || [], shipping: null, currency: "USD", payment_link: "", message: "", notes: "" };
  await DB.prepare("INSERT INTO orders (id, token, submission_id, status, data, created_at, updated_at) VALUES (?, ?, ?, 'requested', ?, ?, ?)")
    .bind(id, rid(16), b.submission_id || null, JSON.stringify(data), now(), now()).run();
  return json({ ok: true, id });
}
export async function onRequestPatch({ request, env }) {
  const b = await request.json(); if (!b.id) return bad("Missing id");
  const DB = await db(env);
  const row = await DB.prepare("SELECT * FROM orders WHERE id = ?").bind(b.id).first(); if (!row) return bad("Not found", 404);
  const data = { ...JSON.parse(row.data || "{}"), ...(b.data || {}) };
  const status = STATUSES.includes(b.status) ? b.status : row.status;
  await DB.prepare("UPDATE orders SET status = ?, data = ?, updated_at = ? WHERE id = ?").bind(status, JSON.stringify(data), now(), b.id).run();
  return json({ ok: true });
}
export async function onRequestDelete({ request, env }) {
  const id = new URL(request.url).searchParams.get("id"); if (!id) return bad("Missing id");
  await (await db(env)).prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
