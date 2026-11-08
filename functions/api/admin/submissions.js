import { json, bad, db } from "../../_lib.js";
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), status = u.searchParams.get("status");
  const DB = await db(env);
  const q = status ? DB.prepare("SELECT * FROM submissions WHERE status = ? ORDER BY id DESC LIMIT 500").bind(status) : DB.prepare("SELECT * FROM submissions ORDER BY id DESC LIMIT 500");
  const { results } = await q.all();
  return json(results.map((r) => { const d = JSON.parse(r.data || "{}"); delete d._ip; return { ...r, data: d }; }));
}
export async function onRequestPatch({ request, env }) {
  const b = await request.json(); if (!b.id) return bad("Missing id");
  const DB = await db(env);
  if (b.status) await DB.prepare("UPDATE submissions SET status = ? WHERE id = ?").bind(String(b.status).slice(0, 20), b.id).run();
  if (b.notes !== undefined) await DB.prepare("UPDATE submissions SET notes = ? WHERE id = ?").bind(String(b.notes).slice(0, 4000), b.id).run();
  return json({ ok: true });
}
export async function onRequestDelete({ request, env }) {
  const id = new URL(request.url).searchParams.get("id"); if (!id) return bad("Missing id");
  await (await db(env)).prepare("DELETE FROM submissions WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
