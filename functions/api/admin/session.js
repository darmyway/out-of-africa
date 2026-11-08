import { json, checkSession } from "../../_lib.js";
export async function onRequestGet({ request, env }) {
  return json({ signedIn: await checkSession(env, request), passwordSet: !!env.ADMIN_PASSWORD, storage: { db: !!env.DB, media: !!env.MEDIA } });
}
