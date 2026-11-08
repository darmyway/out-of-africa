// GET /api/catalog : everything the public site needs, in one request.
import { json, db, getSite, list, publicItem } from "../_lib.js";

export async function onRequestGet({ env }) {
  try {
    const DB = await db(env);
    const [site, artists, artworks] = await Promise.all([getSite(DB), list(DB, "artists"), list(DB, "artworks")]);
    // formAccessKey stays: Web3Forms keys are public by design and the browser sends the email copy.
    const works = site.showDrafts ? artworks : artworks.filter((w) => !w.draft);   // hidden drafts never leave the server
    return json({ site, artists: artists.map(publicItem), artworks: works.map(publicItem) });
  } catch (e) {
    return json({ error: "catalog unavailable" }, 503);
  }
}
