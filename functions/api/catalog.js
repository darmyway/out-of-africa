// GET /api/catalog : everything the public site needs, in one request.
import { json, db, getSite, list } from "../_lib.js";

export async function onRequestGet({ env }) {
  try {
    const DB = await db(env);
    const [site, artists, artworks] = await Promise.all([getSite(DB), list(DB, "artists"), list(DB, "artworks")]);
    delete site.formAccessKey;
    return json({ site, artists, artworks });
  } catch (e) {
    return json({ error: "catalog unavailable" }, 503);
  }
}
