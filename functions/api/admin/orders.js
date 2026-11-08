// Orders: created from checkout requests, turned into quotes, tracked to delivery.
import { json, bad, db, now, rid } from "../../_lib.js";
const STATUSES = ["requested", "quoted", "paid", "shipped", "delivered", "cancelled"];

export async function onRequestGet({ env }) {
  const { results } = await (await db(env)).prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500").all();
  return json(results.map((r) => ({ ...r, data: JSON.parse(r.data || "{}") })));
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
