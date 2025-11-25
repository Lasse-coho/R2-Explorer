// packages/worker/dev/index.ts

// ⚠️ Simpel worker KUN til /preview – ingen UI her.
async function handlePreview(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response("Missing 'key' query parameter", { status: 400 });
  }

  // R2-binding – skal matche binding-navnet i dev/wrangler.toml
  // [[r2_buckets]]
  // binding = "coho"
  // bucket_name = "coho-deliveries-dev"
  const bucket = (env as any).coho;
  if (!bucket) {
    return new Response("R2 bucket binding 'coho' not found on env", {
      status: 500,
    });
  }

  const object = await bucket.get(key);

  if (!object || !object.body) {
    return new Response("Object not found", { status: 404 });
  }

  // Basic headers til video-streaming
  const headers = new Headers();

  // Content-Type: brug metadata hvis den findes, ellers antag mp4
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType || "video/mp4"
  );

  // Størrelse (hjælper browseren lidt)
  if (typeof object.size === "number") {
    headers.set("Content-Length", object.size.toString());
  }

  // Tillad evt. senere Range-requests
  headers.set("Accept-Ranges", "bytes");

  return new Response(object.body, {
    status: 200,
    headers,
  });
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // 🎯 Vores eneste feature på denne worker:
    if (url.pathname === "/preview") {
      return handlePreview(request, env);
    }

    // Alt andet = almindelig 404
    return new Response("Not found", { status: 404 });
  },
};
