// Artists: list, create or update, delete, reorder.
import { json, bad, db, list, slugify, now, cleanArtist } from "../../_lib.js";

export async function onRequestGet({ env }) { return json(await list(await db(env), "artists")); }

export async function onRequestPost({ request, env }) {
  const DB = await db(env);
  const body = await request.json();
  if (Array.isArray(body.order)) {                                    // reorder
    await DB.batch(body.order.map((id, i) => DB.prepare("UPDATE artists SET sort = ? WHERE id = ?").bind(i, String(id))));
    return json({ ok: true });
  }
  let id = body.id ? String(body.id) : "";
  const exists = id && (await DB.prepare("SELECT id FROM artists WHERE id = ?").bind(id).first());
  if (!exists) {
    const base = slugify(body.name); id = base; let n = 2;
    while (await DB.prepare("SELECT id FROM artists WHERE id = ?").bind(id).first()) id = `${base}-${n++}`;
  }
  const w = cleanArtist(body, id);
  if (exists) await DB.prepare("UPDATE artists SET data = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(w), now(), id).run();
  else {
    const { m } = await DB.prepare("SELECT COALESCE(MIN(sort), 0) - 1 AS m FROM artists").first();
    await DB.prepare("INSERT INTO artists (id, data, sort, updated_at) VALUES (?, ?, ?, ?)").bind(id, JSON.stringify(w), m, now()).run();
  }
  return json({ ok: true, item: w });
}

export async function onRequestDelete({ request, env }) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad("Missing id");
  await (await db(env)).prepare("DELETE FROM artists WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
