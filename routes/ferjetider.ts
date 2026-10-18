import { render } from "https://esm.sh/preact-render-to-string@6.5.12";
import { addRoute } from "../router.ts";
import {
  ferryLines,
  getFerryDistance,
  places,
} from "../ferryFetcher.ts";
import { Ferjetider } from "../pages/ferjetider.tsx";
import { Ferjeliste } from "../pages/ferjeliste.tsx";
import {
  getClosestRoute,
  hasCoordinates,
  resolveRoute,
} from "../utils/geo.ts";
import { htmlResponse, jsonResponse } from "../utils/http.ts";
import { parseCoordinates } from "../utils/html.ts";

function hasNoRoute(directions: unknown): boolean {
  if (!directions || typeof directions !== "object") {
    return false;
  }

  const routes = (directions as { routes?: unknown }).routes;
  return Array.isArray(routes) && routes.length === 0;
}

async function renderFerjetiderPage(
  req: Request,
  route?: { from?: string | null; to?: string | null },
) {
  const url = new URL(req.url);
  const coordinates = parseCoordinates(url);

  if (route && (route.from || route.to)) {
    if (
      !route.from || !route.to || !places[route.from] || !places[route.to]
    ) {
      return new Response("Unknown ferry route", { status: 404 });
    }
  }

  const resolvedRoute = resolveRoute(route?.from, route?.to);

  const page = `<!DOCTYPE html>${
    render(
      await Ferjetider({
        ...resolvedRoute,
        ...coordinates,
      }),
    )
  }`;

  return htmlResponse(page);
}

export function registerFerjetiderRoutes() {
  addRoute("GET", "/", async (req) => {
    return await renderFerjetiderPage(req);
  });

  addRoute("GET", "/ferjeliste", (req) => {
    const url = new URL(req.url);
    const props = parseCoordinates(url);

    const response = `<!DOCTYPE html>${
      render(
        Ferjeliste(props),
      )
    }`;

    return htmlResponse(response);
  });

  addRoute("GET", "/ferjetider", async (req) => {
    const url = new URL(req.url);
    const selectedFrom = url.searchParams.get("from");
    const selectedTo = url.searchParams.get("to");

    if (selectedFrom && selectedTo) {
      const route = resolveRoute(selectedFrom, selectedTo);
      const destination = new URL(
        `/ferjetider/${route.from}-${route.to}`,
        req.url,
      );
      const coordinates = parseCoordinates(url);
      if (hasCoordinates(coordinates.userLat, coordinates.userLon)) {
        destination.searchParams.set("lat", String(coordinates.userLat));
        destination.searchParams.set("lon", String(coordinates.userLon));
      }

      return Response.redirect(destination, 302);
    }

    return await renderFerjetiderPage(req);
  });

  addRoute("GET", "/ferjetider/:from-:to", async (req, params) => {
    return await renderFerjetiderPage(req, {
      from: params?.from,
      to: params?.to,
    });
  });

  addRoute("GET", "/ferjetider/nearest", (req) => {
    const url = new URL(req.url);
    const coordinates = parseCoordinates(url);
    if (!hasCoordinates(coordinates.userLat, coordinates.userLon)) {
      return Response.redirect(new URL("/ferjetider", req.url), 302);
    }

    const { userLat, userLon } = coordinates;
    if (userLat === undefined || userLon === undefined) {
      return Response.redirect(new URL("/ferjetider", req.url), 302);
    }

    const route = getClosestRoute(userLat, userLon, ferryLines);
    const destination = new URL(`/ferjetider/${route.from}-${route.to}`, req.url);
    destination.searchParams.set("lat", String(userLat));
    destination.searchParams.set("lon", String(userLon));

    return Response.redirect(destination, 302);
  });

  addRoute(
    "GET",
    "/ferje-directions/:ferjenavn/:latlon",
    async (_req, params) => {
      const ferjenavn = params?.ferjenavn;
      const latlon = params?.latlon;

      if (!ferjenavn || !latlon || !places[ferjenavn]) {
        return new Response(null, { status: 400 });
      }

      const [lonParamRaw, latParamRaw, ...extraCoordinates] = latlon.split(",");
      const lonParam = lonParamRaw?.trim();
      const latParam = latParamRaw?.trim();
      const lon = Number(lonParam);
      const lat = Number(latParam);
      const hasValidCoordinatePair = extraCoordinates.length === 0 &&
        lonParam !== undefined && latParam !== undefined &&
        lonParam.length > 0 && latParam.length > 0 &&
        Number.isFinite(lon) && Number.isFinite(lat) &&
        lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;

      if (!hasValidCoordinatePair) {
        return new Response(null, { status: 400 });
      }

      const authKey = Deno.env.get("OPEN_ROUTE_KEY");
      if (!authKey) {
        return new Response(null, { status: 503 });
      }

      const normalizedLatLon = `${lon},${lat}`;
      const directions = await getFerryDistance(ferjenavn, normalizedLatLon);
      if (!directions) {
        return new Response(null, { status: 502 });
      }

      if (hasNoRoute(directions)) {
        return new Response(null, { status: 404 });
      }

      return jsonResponse(directions);
    },
  );

  addRoute("GET", "/api/ferry-config", () => {
    return jsonResponse({
      ferryLines,
      places,
    });
  });
}
