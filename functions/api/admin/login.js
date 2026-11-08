import { json, bad, db, safeEqual, makeSession, sessionCookie, hashPassword, logActivity } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return bad("Dashboard password is not set yet. Add ADMIN_PASSWORD in Cloudflare settings.", 503);
  const DB = await db(env);
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const since = Date.now() - 15 * 60e3;
  const { n } = await DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?").bind(ip, since).first();
  if (n >= 6) return bad("Too many attempts. Try again in 15 minutes.", 429);
  let body = {}; try { body = await request.json(); } catch (e) {}
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const failed = async (msg) => { await DB.prepare("INSERT INTO login_attempts (ip, at) VALUES (?, ?)").bind(ip, Date.now()).run(); return bad(msg, 401); };

  // Owner: no username, master password from Cloudflare. Nothing in the dashboard can change this.
  if (!username) {
    if (!(await safeEqual(password, env.ADMIN_PASSWORD))) return failed("That password is not right.");
    await DB.prepare("DELETE FROM login_attempts WHERE ip = ? OR at < ?").bind(ip, since).run();
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(await makeSession(env), 30 * 86400) });
  }

  // Team member
  const r = await DB.prepare("SELECT * FROM team WHERE username = ?").bind(username).first();
  const hash = r ? await hashPassword(password, r.salt) : await hashPassword(password, "no-user");
  if (!r || !(await safeEqual(hash, r.pass_hash))) return failed("That username or password is not right.");
  if (!r.active) return failed("This login has been switched off.");
  const exp = r.expires_at ? new Date(r.expires_at).getTime() : 0;
  if (exp && exp <= Date.now()) return failed("This login has expired.");
  await DB.prepare("DELETE FROM login_attempts WHERE ip = ? OR at < ?").bind(ip, since).run();
  await DB.prepare("UPDATE team SET last_login = ? WHERE id = ?").bind(new Date().toISOString(), r.id).run();
  await logActivity(DB, r.username, "Signed in");
  const days = Math.max(0.01, Math.min(7, exp ? (exp - Date.now()) / 864e5 : 7));
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(await makeSession(env, days, { u: r.id, v: r.session_ver }), Math.ceil(days * 86400)) });
}
