import { json, db, getSite } from "../../_lib.js";
export async function onRequestGet({ env }) { return json(await getSite(await db(env))); }
export async function onRequestPut({ request, env }) {
  const DB = await db(env);
  const site = { ...(await getSite(DB)), ...(await request.json()) };
  if (JSON.stringify(site).length > 60000) return json({ error: "Settings too large" }, 400);
  await DB.prepare("INSERT INTO settings (key, value) VALUES ('site', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(site)).run();
  return json({ ok: true, site });
}
