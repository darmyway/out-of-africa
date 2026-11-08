// GET /media/<key> : photos uploaded from the dashboard, stored in Workers KV.
export async function onRequestGet({ params, env }) {
  const key = (params.path || []).join("/");
  if (!env.MEDIA || !key) return new Response("Not found", { status: 404 });
  const { value, metadata } = await env.MEDIA.getWithMetadata(key, { type: "arrayBuffer", cacheTtl: 86400 });
  if (!value) return new Response("Not found", { status: 404 });
  return new Response(value, { headers: { "content-type": (metadata && metadata.type) || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
}
