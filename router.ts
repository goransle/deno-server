type CallbackHandler = (
  request: Request,
  params?: Record<string, string>,
) => Promise<Response>;

export interface Route {
  pattern: URLPattern;
  handler: CallbackHandler;
}

export const routes: Record<string, Route[]> = {
  GET: [],
  POST: [],
  PUT: [],
  PATCH: [],
};

export function addRoute(
  method: string,
  pathname: string,
  handler: CallbackHandler,
) {
  routes[method].push({ pattern: new URLPattern({ pathname }), handler });
}

export async function getRoute(req: Request) {
  for (const route of routes[req.method]) {
    if (route.pattern.test(req.url)) {
      const params = route.pattern.exec(req.url).pathname.groups;
      return await route.handler(req, params);
    }
  }

  return new Response(null, { status: 404 });
}
