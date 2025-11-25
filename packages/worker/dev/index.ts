// packages/worker/dev/index.ts

// 🔧 Lille helper til at hente R2 bucket'en
function getBucket(env: any) {
  const bucket = (env as any).coho; // binding = "coho" i dev/wrangler.toml
  if (!bucket) {
    throw new Error("R2 bucket binding 'coho' not found on env");
  }
  return bucket;
}

// 🎥 Preview handler (samme som før, bare med lidt bedre fejlbeskeder)
async function handlePreview(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response("Missing 'key' query parameter", { status: 400 });
  }

  const bucket = getBucket(env);

  const object = await bucket.get(key);

  if (!object || !object.body) {
    return new Response(`Object not found for key: ${key}`, { status: 404 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType || "video/mp4"
  );
  if (typeof object.size === "number") {
    headers.set("Content-Length", object.size.toString());
  }
  headers.set("Accept-Ranges", "bytes");

  return new Response(object.body, {
    status: 200,
    headers,
  });
}

// 🧪 DEBUG 1: List de første ~50 keys i bucketten
async function handleDebugList(env: any): Promise<Response> {
  const bucket = getBucket(env);
  const list = await bucket.list({ limit: 50 });

  const keys = list.objects.map((o: any) => o.key);

  return new Response(JSON.stringify({ count: keys.length, keys }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// 🧪 DEBUG 2: List keys med bestemt prefix
async function handleDebugPrefix(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const prefix = url.searchParams.get("prefix") || "";

  const bucket = getBucket(env);
  const list = await bucket.list({ prefix, limit: 50 });

  const keys = list.objects.map((o: any) => o.key);

  return new Response(
    JSON.stringify({ prefix, count: keys.length, keys }, null, 2),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 🎯 Vores tre endpoints på dev-worker'en:
    if (path === "/preview") {
      return handlePreview(request, env);
    }

    if (path === "/debug-r2") {
      return handleDebugList(env);
    }

    if (path === "/debug-prefix") {
      return handleDebugPrefix(request, env);
    }

    return new Response("Not found (dev worker)", { status: 404 });
  },
};
