import { json, bad, db, safeEqual, makeSession, sessionCookie } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return bad("Dashboard password is not set yet. Add ADMIN_PASSWORD in Cloudflare settings.", 503);
  const DB = await db(env);
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const since = Date.now() - 15 * 60e3;
  const { n } = await DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?").bind(ip, since).first();
  if (n >= 6) return bad("Too many attempts. Try again in 15 minutes.", 429);
  let body = {}; try { body = await request.json(); } catch (e) {}
  if (!(await safeEqual(body.password || "", env.ADMIN_PASSWORD))) {
    await DB.prepare("INSERT INTO login_attempts (ip, at) VALUES (?, ?)").bind(ip, Date.now()).run();
    return bad("That password is not right.", 401);
  }
  await DB.prepare("DELETE FROM login_attempts WHERE ip = ? OR at < ?").bind(ip, since).run();
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(await makeSession(env), 30 * 86400) });
}
