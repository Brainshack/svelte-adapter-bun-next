import env from "./env";
import { buildKitServer } from "./kit-server";
import { buildRoutes } from "./routes";
import { handleSSRRequest } from "./routes/ssr";
import { getManifestFile, parseEnvBytes } from "./utils";

async function getBunServeConfig(): Promise<Parameters<typeof Bun.serve>[0]> {
  const { manifest } = await getManifestFile();
  const kitServer = await buildKitServer(manifest);
  const routes = await buildRoutes();

  return {
    port: env.PORT,
    hostname: env.HOST,
    maxRequestBodySize: parseEnvBytes(env.BODY_SIZE_LIMIT),
    development: env.DEV_MODE,
    async fetch(req, srv) {
      const pathname = new URL(req.url).pathname;
      
      // Try to match against registered routes (static/prerendered)
      for (const [pattern, handler] of Object.entries(routes)) {
        // Skip the generic /_app/* pattern for /_app/remote/* paths
        // to let them fall through to Kit server
        if (pathname.startsWith('/_app/remote/') && pattern === '/_app/*') {
          continue;
        }
        
        // Convert Bun route pattern to regex for matching
        const regexPattern = pattern
          .replace(/\*/g, '.*')
          .replace(/\//g, '\\/');
        const regex = new RegExp(`^${regexPattern}$`);
        
        if (regex.test(pathname)) {
          return await handler(req, srv);
        }
      }
      
      // Pass to SvelteKit for SSR/server functions/API routes
      return await handleSSRRequest(req, srv, kitServer);
    },
    error(e: Error) {
      console.error(e);

      return Response.json(
        {
          code: 500,
          message: "Oops! An unexpected error occurred.",
          error: e.message,
        },
        { status: 500 },
      );
    },
  };
}

async function serve() {
  console.info(`Listening on ${env.HOST}:${env.PORT}`);
  Bun.serve(await getBunServeConfig());
}

export default serve();
