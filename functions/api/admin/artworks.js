// Artworks: list, create or update, delete, reorder.
// Artist logins only see and edit their own works; without "publish" rights their edits wait for approval.
import { json, bad, db, list, slugify, now, cleanArtwork, getRow } from "../../_lib.js";

export async function onRequestGet({ env, data }) {
  const all = await list(await db(env), "artworks"), u = data.user;
  return json(u.artist ? all.filter((w) => u.perms.artists.includes(w.artist)) : all);
}

export async function onRequestPost({ request, env, data }) {
  const DB = await db(env), u = data.user;
  const body = await request.json();
  if (Array.isArray(body.order)) {                                    // reorder
    if (u.artist) return bad("Only the owner can reorder works.", 403);
    await DB.batch(body.order.map((id, i) => DB.prepare("UPDATE artworks SET sort = ? WHERE id = ?").bind(i, String(id))));
    return json({ ok: true });
  }
  let id = body.id ? String(body.id) : "";
  const existing = await getRow(DB, "artworks", id);
  if (!existing) {
    const base = slugify(body.title); id = base; let n = 2;
    while (await DB.prepare("SELECT id FROM artworks WHERE id = ?").bind(id).first()) id = `${base}-${n++}`;
  }
  let w = cleanArtwork(body, id);

  if (u.artist) {
    const mine = u.perms.artists;
    if (existing && !mine.includes(existing.artist)) return bad("This work belongs to another artist.", 403);
    if (!mine.includes(w.artist)) w.artist = existing ? existing.artist : mine[0];
    if (!w.artist) return bad("Your login is not linked to an artist profile yet.", 403);
    w.featured = existing ? !!existing.featured : false;
    if (!u.perms.prices) w.price = existing ? existing.price : null;
    if (existing) w.added = existing.added;
    if (!u.perms.publish) {
      const review = { by: u.username, at: now() };
      if (!existing) { w.draft = true; w.review = { ...review, isNew: true }; }
      else if (existing.review && existing.review.isNew) { w.draft = true; w.review = { ...review, isNew: true }; }
      else { w = { ...existing, review: { ...review, changes: w } }; delete w.sort; }
    }
  } else if (existing && existing.review) {
    w.review = existing.review;                                        // keep an artist's pending change until it's reviewed
  }

  if (existing) await DB.prepare("UPDATE artworks SET data = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(w), now(), id).run();
  else {
    const { m } = await DB.prepare("SELECT COALESCE(MIN(sort), 0) - 1 AS m FROM artworks").first();
    await DB.prepare("INSERT INTO artworks (id, data, sort, updated_at) VALUES (?, ?, ?, ?)").bind(id, JSON.stringify(w), m, now()).run();
  }
  return json({ ok: true, item: w, pending: !!(w.review && !w.review.rejected) });
}

export async function onRequestDelete({ request, env }) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad("Missing id");
  await (await db(env)).prepare("DELETE FROM artworks WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
