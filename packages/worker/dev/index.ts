import { R2Explorer } from "../src";

const baseConfig = {
  readonly: false,
  cors: true,
  showHiddenFiles: true,
};

// 🔎 DEBUG-preview-handler — tjekker kun om /preview-route bliver ramt
async function handlePreview(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  const body = JSON.stringify(
    {
      message: "Preview route IS HIT 🎯",
      pathname: url.pathname,
      key,
    },
    null,
    2
  );

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
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
