// Team logins. Owner only (enforced in _middleware.js).
import { json, bad, db, rid, now, hashPassword, cleanPerms } from "../../_lib.js";

const row = (r) => ({ id: r.id, username: r.username, name: r.name, perms: cleanPerms(JSON.parse(r.perms || "{}")), expires_at: r.expires_at, active: !!r.active, created_at: r.created_at, last_login: r.last_login });

export async function onRequestGet({ env }) {
  const DB = await db(env);
  const [team, log] = await Promise.all([
    DB.prepare("SELECT * FROM team ORDER BY created_at DESC").all(),
    DB.prepare("SELECT who, action, at FROM activity ORDER BY id DESC LIMIT 150").all()]);
  return json({ team: team.results.map(row), activity: log.results });
}

export async function onRequestPost({ request, env }) {
  const DB = await db(env);
  let b; try { b = await request.json(); } catch (e) { return bad("Invalid request"); }

  if (b.action === "signout-all") {
    await DB.prepare("UPDATE team SET session_ver = session_ver + 1").run();
    return json({ ok: true });
  }

  const username = String(b.username || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return bad("Username: 3 to 30 characters, letters, numbers, dots, dashes or underscores.");
  if (username === "owner" || username === "admin") return bad("Please choose a different username.");
  const password = String(b.password || "");
  if (password && password.length < 8) return bad("Password must be at least 8 characters.");
  let expires = null;
  if (b.expires_at) { const t = new Date(b.expires_at); if (isNaN(t)) return bad("That expiry date is not valid."); expires = t.toISOString(); }
  const perms = JSON.stringify(cleanPerms(b.perms));
  const name = String(b.name || "").slice(0, 80);
  const active = b.active === false ? 0 : 1;

  const clash = await DB.prepare("SELECT id FROM team WHERE username = ?").bind(username).first();
  if (clash && clash.id !== b.id) return bad("That username is already taken.");

  if (!b.id) {
    if (!password) return bad("Set a password for this login.");
    const id = rid(10), salt = rid(16);
    await DB.prepare("INSERT INTO team (id, username, name, pass_hash, salt, perms, expires_at, active, session_ver, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)")
      .bind(id, username, name, await hashPassword(password, salt), salt, perms, expires, active, now()).run();
    return json({ ok: true, id, username });
  }

  const cur = await DB.prepare("SELECT * FROM team WHERE id = ?").bind(b.id).first();
  if (!cur) return bad("Login not found", 404);
  // Any change signs the person out, so new limits apply straight away.
  if (password) {
    const salt = rid(16);
    await DB.prepare("UPDATE team SET username=?, name=?, perms=?, expires_at=?, active=?, pass_hash=?, salt=?, session_ver=session_ver+1 WHERE id=?")
      .bind(username, name, perms, expires, active, await hashPassword(password, salt), salt, b.id).run();
  } else {
    await DB.prepare("UPDATE team SET username=?, name=?, perms=?, expires_at=?, active=?, session_ver=session_ver+1 WHERE id=?")
      .bind(username, name, perms, expires, active, b.id).run();
  }
  return json({ ok: true, id: b.id, username });
}

export async function onRequestDelete({ request, env }) {
  const id = new URL(request.url).searchParams.get("id"); if (!id) return bad("Missing id");
  const DB = await db(env);
  await DB.prepare("DELETE FROM team WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
