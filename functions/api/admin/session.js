import { json, getUser } from "../../_lib.js";
export async function onRequestGet({ request, env }) {
  const u = await getUser(env, request);
  return json({ signedIn: !!u, me: u ? { name: u.name, owner: u.owner, perms: u.perms, expires_at: u.expires_at || null } : null,
    passwordSet: !!env.ADMIN_PASSWORD, storage: { db: !!env.DB, media: !!env.MEDIA } });
}
