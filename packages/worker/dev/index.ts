// packages/worker/dev/index.ts

function getBucket(env: any) {
  const bucket = (env as any).coho; // binding = "coho" i dev/wrangler.toml
  if (!bucket) {
    throw new Error("R2 bucket binding 'coho' not found on env");
  }
  return bucket;
}

// 🎥 Rå stream af filen (samme som før)
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

// 📺 Simpel HTML-side med video player
function buildWatchPage(key: string): string {
  const encodedKey = encodeURIComponent(key);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>CoHo Preview – ${key}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #050510;
        color: #f5f5f5;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        align-items: center;
        justify-content: center;
      }
      .wrapper {
        width: 100%;
        max-width: 1200px;
        padding: 16px;
        box-sizing: border-box;
      }
      h1 {
        font-size: 16px;
        font-weight: 500;
        margin: 0 0 8px 0;
        opacity: 0.8;
      }
      video {
        width: 100%;
        max-height: calc(100vh - 80px);
        background: #000;
        border-radius: 8px;
        outline: none;
      }
      .key {
        font-size: 11px;
        opacity: 0.6;
        word-break: break-all;
        margin-bottom: 8px;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <h1>CoHo Video Preview</h1>
      <div class="key">${key}</div>
      <video controls autoplay playsinline src="/preview?key=${encodedKey}"></video>
    </div>
  </body>
</html>`;
}

async function handleWatch(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response("Missing 'key' query parameter", { status: 400 });
  }

  // Tjek lige at objektet findes, så vi ikke viser en tom player
  const bucket = getBucket(env);
  const object = await bucket.head(key);
  if (!object) {
    return new Response(`Object not found for key: ${key}`, { status: 404 });
  }

  const html = buildWatchPage(key);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

// (valgfrit) debug endpoints kan vi tilføje igen senere om nødvendigt

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/preview") {
      return handlePreview(request, env);
    }

    if (path === "/watch") {
      return handleWatch(request, env);
    }

    return new Response("Not found (dev worker)", { status: 404 });
  },
};
