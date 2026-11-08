// POST /api/submit : every public form lands here and appears in the dashboard inbox.
import { json, bad, db, now, rid } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return bad("Invalid request"); }
  if (body.company_website) return json({ ok: true });                 // spam trap
  const kind = String(body.form || "Message").slice(0, 60);
  const data = {};
  for (const [k, v] of Object.entries(body)) {
    if (["form", "company_website"].includes(k)) continue;
    data[String(k).slice(0, 40)] = String(v ?? "").slice(0, 4000);
  }
  const email = data.email || "";
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return bad("Please enter a valid email.");
  const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(" ");
  const DB = await db(env);

  const ip = request.headers.get("cf-connecting-ip") || "";
  const recent = await DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE created_at > ? AND json_extract(data, '$._ip') = ?")
    .bind(new Date(Date.now() - 10 * 60e3).toISOString(), ip).first();
  if (recent && recent.n > 12) return bad("Too many messages. Please try again shortly.", 429);
  data._ip = ip;

  const res = await DB.prepare("INSERT INTO submissions (kind, name, email, data, status, created_at) VALUES (?, ?, ?, ?, 'new', ?)")
    .bind(kind, name.slice(0, 120), email.slice(0, 160), JSON.stringify(data), now()).run();
  const sid = res.meta.last_row_id;

  if (kind === "Order request") {
    let items = [];
    try { items = JSON.parse(data.items_json || "[]"); } catch (e) {}
    const order = { buyer: { name, email, phone: data.phone || "", address: [data.address_line1, data.address_line2, data.city, data.region, data.postcode, data.country].filter(Boolean).join(", ") },
      items: items.slice(0, 20).map((i) => ({ id: String(i.id || ""), title: String(i.title || ""), artist: String(i.artist || ""), price: i.price == null ? null : Number(i.price) })),
      shipping: null, currency: "USD", payment_link: "", message: "", notes: data.notes || "" };
    await DB.prepare("INSERT INTO orders (id, token, submission_id, status, data, created_at, updated_at) VALUES (?, ?, ?, 'requested', ?, ?, ?)")
      .bind("OA-" + rid(6).toUpperCase(), rid(16), sid, JSON.stringify(order), now(), now()).run();
  }

  // The email copy (Web3Forms) is sent from the visitor's browser in app.js,
  // because the Web3Forms free plan rejects server-to-server requests.
  return json({ ok: true, id: sid });
}
