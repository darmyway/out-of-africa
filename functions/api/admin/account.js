// A team member changes their own password. The owner's password lives in Cloudflare and can't be changed here.
import { json, bad, db, rid, hashPassword, safeEqual } from "../../_lib.js";
export async function onRequestPost({ request, env, data }) {
  const u = data.user;
  if (u.owner) return bad("Your owner password is set in Cloudflare, not here.", 400);
  const b = await request.json().catch(() => ({}));
  const DB = await db(env);
  const r = await DB.prepare("SELECT salt, pass_hash FROM team WHERE id = ?").bind(u.id).first();
  if (!r || !(await safeEqual(await hashPassword(String(b.current || ""), r.salt), r.pass_hash))) return bad("Your current password is not right.", 400);
  if (String(b.password || "").length < 8) return bad("New password must be at least 8 characters.");
  const salt = rid(16);
  await DB.prepare("UPDATE team SET pass_hash = ?, salt = ? WHERE id = ?").bind(await hashPassword(String(b.password), salt), salt, u.id).run();
  return json({ ok: true });
}
