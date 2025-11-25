import { R2Explorer } from "../src";

const baseConfig = {
  readonly: false,
  cors: true,
  showHiddenFiles: true,
};

// 👇 NY FUNKTION: håndterer /preview requests
async function handlePreview(request, env) {
  const url = new URL(request.url);

  // vi forventer ?key=<stien til filen i buckettet>
  const key = url.searchParams.get("key");
  if (!key) {
    return new Response("Missing 'key' query parameter", { status: 400 });
  }

  try {
    // ⚠️ VIGTIGT: vi antager, at din R2-binding hedder "coho"
    // Det er meget sandsynligt pga. R2EXPLORER_BUCKETS = coho:coho-deliveries-dev
    const bucket = env.coho;
    if (!bucket) {
      return new Response("R2 binding 'coho' not found on env", { status: 500 });
    }

    const object = await bucket.get(key);

    if (!object || !object.body) {
      return new Response("File not found", { status: 404 });
    }

    // Brug metadata hvis de findes, ellers fallback til video/mp4
    const contentType =
      (object.httpMetadata && object.httpMetadata.contentType) ||
      "video/mp4";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");

    // Simpel version uden Range-håndtering (progressiv download/stream)
    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("Error in /preview:", err);
    return new Response("Internal error in preview", { status: 500 });
  }
}

export default {
  async email(event, env, context) {
    await R2Explorer(baseConfig).email(event, env, context);
  },
  async fetch(request, env, context) {
    const url = new URL(request.url);

    // 👇 NYT: hvis path er /preview, så bruger vi vores egen handler
    if (url.pathname === "/preview") {
      return handlePreview(request, env);
    }

    // 👇 alt andet går videre til R2Explorer som før
    return R2Explorer({
      ...baseConfig,
      basicAuth: {
        username: env.BASIC_USERNAME,
        password: env.BASIC_PASSWORD,
      },
    }).fetch(request, env, context);
  },
};
