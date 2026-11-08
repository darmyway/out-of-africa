import { json, db } from "../../_lib.js";
export async function onRequestGet({ env }) {
  const DB = await db(env);
  const [works, artists, inbox, orders] = await Promise.all([
    DB.prepare("SELECT data FROM artworks").all(), DB.prepare("SELECT COUNT(*) AS n FROM artists").first(),
    DB.prepare("SELECT status, COUNT(*) AS n FROM submissions GROUP BY status").all(), DB.prepare("SELECT status, COUNT(*) AS n FROM orders GROUP BY status").all()]);
  const w = works.results.map((r) => JSON.parse(r.data));
  const by = (rows) => Object.fromEntries(rows.results.map((r) => [r.status, r.n]));
  return json({ artworks: { total: w.length, available: w.filter((x) => x.status === "available" && !x.draft).length, sold: w.filter((x) => x.status === "sold").length, drafts: w.filter((x) => x.draft).length, priced: w.filter((x) => x.price != null).length },
    artists: artists.n, inbox: by(inbox), orders: by(orders) });
}
