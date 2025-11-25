import { R2Explorer } from "../src";

const baseConfig = {
  readonly: false,
  cors: true,
  showHiddenFiles: true,
};

// midlertidig super-simpel preview handler
async function handlePreview(_request: Request): Promise<Response> {
  return new Response("HELLO FROM /preview (dev index.ts)", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export default {
  async email(event: any, env: any, context: any) {
    await R2Explorer(baseConfig).email(event, env, context);
  },

  async fetch(request: Request, env: any, context: any): Promise<Response> {
    const url = new URL(request.url);

    // ⬇️ FANG /preview FØRST
    if (url.pathname === "/preview") {
      return handlePreview(request);
    }

    // Resten af trafikken går til det normale R2-Explorer UI
    return R2Explorer({
      ...baseConfig,
      basicAuth: {
        username: (env as any).BASIC_USERNAME,
        password: (env as any).BASIC_PASSWORD,
      },
    }).fetch(request, env, context);
  },
};
