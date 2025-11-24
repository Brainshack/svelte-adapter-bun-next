import type { Server as KitServer } from "@sveltejs/kit";
import env from "../env";
import { get_origin } from "../utils";

export function handleSSRRequest(
  originalRequest: Request,
  bun_server: Bun.Server,
  kit_server: KitServer,
): Promise<Response> {
  const baseOrigin = env.ORIGIN || get_origin(originalRequest.headers);
  
  // Parse the original URL to get pathname and search params
  const originalUrl = new URL(originalRequest.url);
  const pathAndQuery = originalUrl.pathname + originalUrl.search;

  const request = new Request(`${baseOrigin}${pathAndQuery}`, {
    method: originalRequest.method,
    headers: originalRequest.headers,
    body: originalRequest.body,
    redirect: originalRequest.redirect,
    // ...originalRequest,
  });

  return kit_server.respond(request, {
    getClientAddress() {
      return bun_server.requestIP(originalRequest)?.address || "127.0.0.1";
    },
    platform: {
      isBun: () => true,
    },
  });
}
