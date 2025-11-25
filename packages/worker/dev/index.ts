import { R2Explorer } from "../src";

const baseConfig = {
  readonly: false,
  cors: true,
  showHiddenFiles: true,
};

// Simpel preview-handler til video (mp4) m.m.
async function handlePreview(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response("Missing 'key' query parameter", { status: 400 });
  }

  // R2-binding – navnet SKAL matche wrangler.toml (binding = "coho")
  const bucket = (env as any).coho;
  if (!bucket) {
    return new Response("R2 bucket binding 'coho' not found", { status: 500 });
  }

  const object = await bucket.get(key);

  if (!object || !object.body) {
    return new Response("Object not found", { status: 404 });
  }

  // Sæt fornuftige headers til video
  const headers = new Headers();
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType || "video/mp4"
  );
  headers.set("Content-Length", object.size?.toString() ?? "");
  headers.set("Accept-Ranges", "bytes");

  return new Response(object.body, {
    status: 200,
    headers,
  });
}

export default {
  async email(event: any, env: any, context: any) {
    await R2Explorer(baseConfig).email(event, env, context);
  },

  async fetch(request: Request, env: any, context: any): Promise<Response> {
    const url = new URL(request.url);

    // ⬇️ NYT: fang /preview før vi sender noget videre til dashboardet
    if (url.pathname === "/preview") {
      return handlePreview(request, env);
    }

    // Standard R2-Explorer UI
    return R2Explorer({
      ...baseConfig,
      basicAuth: {
        username: (env as any).BASIC_USERNAME,
        password: (env as any).BASIC_PASSWORD,
      },
    }).fetch(request, env, context);
  },
};
