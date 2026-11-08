// Every /api/admin/* request must carry a valid session, except login/session checks.
// The owner can do everything. Team members only reach the sections the owner gave them.
import { bad, getUser, db, logActivity } from "../../_lib.js";
const OPEN = ["/api/admin/login", "/api/admin/session", "/api/admin/logout"];
const SECTION = { artworks: "artworks", artists: "artists", submissions: "inbox", orders: "orders", media: "photos", settings: "settings" };
const PUBLIC_READ = ["artworks", "artists", "settings", "media", "stats"]; // same data the public site shows
const VERB = { POST: "Saved", PUT: "Updated", PATCH: "Updated", DELETE: "Deleted" };
const NAME = { artworks: "artwork", artists: "artist", submissions: "inbox message", orders: "order", media: "photo", settings: "settings", team: "team login" };

function allowed(user, part, method) {
  if (user.owner) return true;
  if (part === "team") return false;                                   // only the owner manages logins
  if (method === "GET" && PUBLIC_READ.includes(part)) return true;
  const p = user.perms;
  if (part === "media" && method === "POST") return [p.photos, p.artworks, p.artists, p.settings].includes("edit");
  const sec = SECTION[part];
  if (!sec) return method === "GET";
  return method === "GET" ? !!p[sec] : p[sec] === "edit";
}

export async function onRequest(context) {
  const { request, env, next, data } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  if (request.method !== "GET" && request.headers.get("x-oa-admin") !== "1") return bad("Forbidden", 403);
  if (OPEN.includes(path)) return next();
  const user = await getUser(env, request);
  if (!user) return bad("Please sign in", 401);
  const part = path.split("/")[3] || "";
  if (!allowed(user, part, request.method)) return bad("You don't have access to this part of the dashboard.", 403);
  data.user = user;

  let label = "";
  if (request.method !== "GET") {
    try {
      if ((request.headers.get("content-type") || "").includes("json")) {
        const b = await request.clone().json();
        label = b.title || b.name || b.username || b.status || b.id || "";
      }
    } catch (e) {}
    label = label || url.searchParams.get("name") || url.searchParams.get("id") || url.searchParams.get("url") || "";
  }
  const res = await next();
  if (request.method !== "GET" && res.ok) {
    const what = (VERB[request.method] || request.method) + " " + (NAME[part] || part) + (label ? ": " + String(label).slice(0, 120) : "");
    context.waitUntil(db(env).then((DB) => logActivity(DB, user.owner ? "Owner" : user.username, what)));
  }
  return res;
}
