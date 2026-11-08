// Artists: list, create or update, delete, reorder.
// Artist logins only see and edit their own profile(s); without "publish" rights edits wait for approval.
import { json, bad, db, list, slugify, now, cleanArtist, getRow } from "../../_lib.js";

export async function onRequestGet({ env, data }) {
  const all = await list(await db(env), "artists"), u = data.user;
  return json(u.artist ? all.filter((a) => u.perms.artists.includes(a.id)) : all);
}

export async function onRequestPost({ request, env, data }) {
  const DB = await db(env), u = data.user;
  const body = await request.json();
  if (Array.isArray(body.order)) {                                    // reorder
    if (u.artist) return bad("Only the owner can reorder artists.", 403);
    await DB.batch(body.order.map((id, i) => DB.prepare("UPDATE artists SET sort = ? WHERE id = ?").bind(i, String(id))));
    return json({ ok: true });
  }
  let id = body.id ? String(body.id) : "";
  const existing = await getRow(DB, "artists", id);
  if (u.artist && (!existing || !u.perms.artists.includes(existing.id))) return bad("You can only edit your own profile.", 403);
  if (!existing) {
    const base = slugify(body.name); id = base; let n = 2;
    while (await DB.prepare("SELECT id FROM artists WHERE id = ?").bind(id).first()) id = `${base}-${n++}`;
  }
  let a = cleanArtist(body, id);
  if (u.artist) {
    a.featured = !!existing.featured;
    if (!u.perms.publish) { a = { ...existing, review: { by: u.username, at: now(), changes: a } }; delete a.sort; }
  } else if (existing && existing.review) a.review = existing.review;

  if (existing) await DB.prepare("UPDATE artists SET data = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(a), now(), id).run();
  else {
    const { m } = await DB.prepare("SELECT COALESCE(MIN(sort), 0) - 1 AS m FROM artists").first();
    await DB.prepare("INSERT INTO artists (id, data, sort, updated_at) VALUES (?, ?, ?, ?)").bind(id, JSON.stringify(a), m, now()).run();
  }
  return json({ ok: true, item: a, pending: !!(a.review && !a.review.rejected) });
}

export async function onRequestDelete({ request, env }) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad("Missing id");
  await (await db(env)).prepare("DELETE FROM artists WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
