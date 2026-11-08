// Every /api/admin/* request must carry a valid session, except login/session checks.
import { bad, checkSession } from "../../_lib.js";
const OPEN = ["/api/admin/login", "/api/admin/session", "/api/admin/logout"];

export async function onRequest({ request, env, next }) {
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  if (request.method !== "GET" && request.headers.get("x-oa-admin") !== "1") return bad("Forbidden", 403);
  if (OPEN.includes(path)) return next();
  if (!(await checkSession(env, request))) return bad("Please sign in", 401);
  return next();
}
