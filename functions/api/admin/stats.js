import { json, db } from "../../_lib.js";
export async function onRequestGet({ env, data }) {
  const DB = await db(env);
  const [works, artists, inbox, orders] = await Promise.all([
    DB.prepare("SELECT data FROM artworks").all(), DB.prepare("SELECT COUNT(*) AS n FROM artists").first(),
    DB.prepare("SELECT status, COUNT(*) AS n FROM submissions GROUP BY status").all(), DB.prepare("SELECT status, COUNT(*) AS n FROM orders GROUP BY status").all()]);
  let w = works.results.map((r) => JSON.parse(r.data));
  if (data.user.artist) w = w.filter((x) => data.user.perms.artists.includes(x.artist));
  const pending = w.filter((x) => x.review && !x.review.rejected).length;
  const by = (rows) => Object.fromEntries(rows.results.map((r) => [r.status, r.n]));
  return json({ artworks: { total: w.length, available: w.filter((x) => x.status === "available" && !x.draft).length, sold: w.filter((x) => x.status === "sold").length, drafts: w.filter((x) => x.draft).length, priced: w.filter((x) => x.price != null).length, pending },
    artists: data.user.artist ? data.user.perms.artists.length : artists.n, inbox: data.user.artist ? {} : by(inbox), orders: data.user.artist ? {} : by(orders) });
}
