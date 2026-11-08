// Approve or decline an artist's pending change. Owner, or a team member with edit rights on that section.
import { json, bad, db, now, getRow } from "../../_lib.js";

export async function onRequestPost({ request, env, data }) {
  const u = data.user, b = await request.json().catch(() => ({}));
  const table = b.kind === "artists" ? "artists" : "artworks", sec = table;
  if (!u.owner && u.perms[sec] !== "edit") return bad("You don't have access to approve this.", 403);
  const DB = await db(env);
  const item = await getRow(DB, table, b.id);
  if (!item || !item.review) return bad("Nothing waiting for approval here.", 404);
  const r = item.review;
  let next;
  if (b.action === "approve") {
    if (r.isNew) { next = { ...item, draft: false }; delete next.review; }
    else { next = { ...item, ...(r.changes || {}), id: item.id, featured: item.featured }; delete next.review; }
  } else if (b.action === "decline") {
    next = { ...item, review: { ...r, rejected: true, note: String(b.note || "").slice(0, 500), reviewed_at: now() } };
  } else return bad("Unknown action");
  delete next.sort;
  await DB.prepare(`UPDATE ${table} SET data = ?, updated_at = ? WHERE id = ?`).bind(JSON.stringify(next), now(), item.id).run();
  return json({ ok: true, item: next });
}
