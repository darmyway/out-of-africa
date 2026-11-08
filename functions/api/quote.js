// GET /api/quote?id=...&t=... : the private quote page a buyer receives.
import { json, bad, db, getSite } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const id = u.searchParams.get("id"), t = u.searchParams.get("t");
  if (!id || !t) return bad("Missing quote", 404);
  const DB = await db(env);
  const row = await DB.prepare("SELECT * FROM orders WHERE id = ? AND token = ?").bind(id, t).first();
  if (!row || row.status === "requested") return bad("Quote not found", 404);
  const d = JSON.parse(row.data), site = await getSite(DB);
  return json({ id: row.id, status: row.status, updated_at: row.updated_at, buyer: { name: d.buyer?.name || "" }, items: d.items || [],
    shipping: d.shipping, currency: d.currency || "USD", payment_link: d.payment_link || "", message: d.message || "", valid_until: d.valid_until || "",
    site: { name: site.name, email: site.email, whatsapp: site.whatsapp } });
}
