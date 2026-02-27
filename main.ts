import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
import {
  fromFileUrl,
  isAbsolute,
  relative,
  resolve,
} from "https://deno.land/std@0.213.0/path/mod.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import { render } from "https://esm.sh/preact-render-to-string@6.5.12";
import { addRoute, getRoute } from "./router.ts";

import scripts from "./scripts.json" with { type: "json" };

// Load config from .env files
// wrap in try cause files don't work on server
try {
  config({ safe: true, export: true });
} catch {
  console.log("No .env support");
}

import "./emojistuff.ts";
import { Ferjetider } from "./pages/ferjetider.tsx";
import { Ferjeliste } from "./pages/ferjeliste.tsx";
import { ferryLines, getFerryDistance, places } from "./ferryFetcher.ts";

type UserCoordinates = {
  userLat?: number;
  userLon?: number;
};
const statusMessagesDirectoryUrl = new URL(
  "./public/status-messages/",
  import.meta.url,
);
const statusMessagesDirectoryPath = fromFileUrl(statusMessagesDirectoryUrl);
const statusMessagesRoutePrefix = "/status-messages/";

function decodePathnameSafely(pathname: string): string | null {
  let decodedPathname = pathname;

  for (let i = 0; i < 5; i++) {
    try {
      const nextDecodedPathname = decodeURIComponent(decodedPathname);
      if (nextDecodedPathname === decodedPathname) {
        return decodedPathname;
      }

      decodedPathname = nextDecodedPathname;
    } catch {
      return null;
    }
  }

  return decodedPathname;
}

function htmlResponse(html: string) {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
    },
  });
}

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
}

function parseCoordinates(url: URL): UserCoordinates {
  const latParamRaw = url.searchParams.get("lat");
  const lonParamRaw = url.searchParams.get("lon");

  if (latParamRaw === null || lonParamRaw === null) {
    return {};
  }

  const latParam = latParamRaw.trim();
  const lonParam = lonParamRaw.trim();

  if (latParam.length === 0 || lonParam.length === 0) {
    return {};
  }

  const lat = Number(latParam);
  const lon = Number(lonParam);
  const hasFiniteCoordinates = Number.isFinite(lat) && Number.isFinite(lon);
  const coordinatesWithinRange = lat >= -90 && lat <= 90 && lon >= -180 &&
    lon <= 180;

  if (!hasFiniteCoordinates || !coordinatesWithinRange) {
    return {};
  }

  return {
    userLat: lat,
    userLon: lon,
  };
}

function hasNoRoute(directions: unknown): boolean {
  if (!directions || typeof directions !== "object") {
    return false;
  }

  const routes = (directions as { routes?: unknown }).routes;
  return Array.isArray(routes) && routes.length === 0;
}

function hasCoordinates(coords: UserCoordinates) {
  return Number.isFinite(coords.userLat) && Number.isFinite(coords.userLon);
}

function resolveRoute(from?: string | null, to?: string | null) {
  const fallback = {
    from: "vangsnes",
    to: "hella",
  };

  if (!from || !to) {
    return fallback;
  }

  if (!places[from] || !places[to]) {
    return fallback;
  }

  return { from, to };
}

function appendVaryHeader(headers: Headers, fieldName: string) {
  const existingVary = headers.get("Vary");
  if (!existingVary) {
    headers.set("Vary", fieldName);
    return;
  }

  const existingFields = existingVary
    .split(",")
    .map((field) => field.trim().toLowerCase());
  if (existingFields.includes(fieldName.toLowerCase())) {
    return;
  }

  headers.set("Vary", `${existingVary}, ${fieldName}`);
}

function getAllowedCorsOrigin(originHeader: string | null) {
  if (!originHeader) {
    return null;
  }

  let originUrl: URL;
  try {
    originUrl = new URL(originHeader);
  } catch {
    return null;
  }

  const { hostname, protocol } = originUrl;
  const isHttpOrigin = protocol === "http:" || protocol === "https:";
  if (!isHttpOrigin) {
    return null;
  }

  const isLocalhostOrigin = hostname === "localhost" ||
    hostname === "127.0.0.1";
  if (isLocalhostOrigin) {
    return originUrl.origin;
  }

  if (protocol !== "https:") {
    return null;
  }

  const allowedHostnames = new Set([
    "goransle.omg.lol",
    "ferjetider.goransle.no",
    "www.goransle.no",
    "deno.dev",
  ]);

  if (allowedHostnames.has(hostname) || hostname.endsWith(".deno.dev")) {
    return originUrl.origin;
  }

  return null;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const earthRadius = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function getClosestRoute(userLat: number, userLon: number) {
  let closestStop: string | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const [key, place] of Object.entries(places)) {
    const distance = calculateDistance(
      userLat,
      userLon,
      place.coordinates.latitude,
      place.coordinates.longitude,
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestStop = key;
    }
  }

  if (!closestStop) {
    return resolveRoute();
  }

  for (const [from, to] of ferryLines) {
    if (from === closestStop) {
      return { from, to };
    }
    if (to === closestStop) {
      return { from: to, to: from };
    }
  }

  return resolveRoute();
}

async function renderFerjetiderPage(
  req: Request,
  route?: { from?: string | null; to?: string | null },
) {
  const url = new URL(req.url);
  const coordinates = parseCoordinates(url);
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

// Add a route that responds with the current time

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
    if (hasCoordinates(coordinates)) {
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
  if (!hasCoordinates(coordinates)) {
    return Response.redirect(new URL("/ferjetider", req.url), 302);
  }

  const { userLat, userLon } = coordinates;
  if (userLat === undefined || userLon === undefined) {
    return Response.redirect(new URL("/ferjetider", req.url), 302);
  }

  const route = getClosestRoute(userLat, userLon);
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

addRoute(
  "GET",
  "/status-messages/*",
  async (req) => {
    const pathname = new URL(req.url).pathname;
    if (!pathname.startsWith(statusMessagesRoutePrefix)) {
      return new Response(null, { status: 404 });
    }

    const requestedPath = pathname.slice(statusMessagesRoutePrefix.length);
    if (requestedPath.length === 0) {
      return new Response(null, { status: 404 });
    }

    const decodedRequestedPath = decodePathnameSafely(requestedPath);
    if (!decodedRequestedPath) {
      return new Response(null, { status: 404 });
    }

    const hasWindowsAbsolutePrefix = /^[a-zA-Z]:[\\/]/.test(
      decodedRequestedPath,
    ) || decodedRequestedPath.startsWith("\\\\");
    if (isAbsolute(decodedRequestedPath) || hasWindowsAbsolutePrefix) {
      return new Response(null, { status: 404 });
    }

    const resolvedFilePath = resolve(
      statusMessagesDirectoryPath,
      decodedRequestedPath,
    );
    const relativePath = relative(
      statusMessagesDirectoryPath,
      resolvedFilePath,
    );
    const isWithinStatusMessagesDirectory = relativePath.length > 0 &&
      !relativePath.startsWith("..") &&
      !isAbsolute(relativePath);
    if (!isWithinStatusMessagesDirectory) {
      return new Response(null, { status: 404 });
    }

    try {
      const file = await Deno.readTextFile(resolvedFilePath);
      return htmlResponse(file);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return htmlResponse("");
      }

      return new Response(null, { status: 500 });
    }
  },
);

addRoute("GET", "/api/ferry-config", () => {
  return jsonResponse({
    ferryLines,
    places,
  });
});

addRoute("GET", "/demo", async () => {
  const file = await Deno.readTextFile("./demo_geolocation.html");

  return htmlResponse(file);
});

// addRoute("GET", "*", async (req) => {
//   console.log(req);
//
//   const filePath = "./public" + new URL(req.url).pathname;
//
//   const fileSize = (await Deno.stat(filePath)).size;
//
//   if (fileSize) {
//     const file = await Deno.open(filePath);
//     return new Response(file.readable, {
//       headers: { "content-length": fileSize.toString() },
//     });
//   }
//
//   return new Response("hello");
// });

for (const scriptObj of scripts) {
  const code = await Deno.readFile(`./dist/scripts/${scriptObj.name}.js`).catch(
    () => null,
  );
  if (!code) {
    continue;
  }

  addRoute("GET", `/scripts/${scriptObj.name}.js`, () => {
    return new Response(code, {
      headers: {
        "Content-Type": "application/javascript; charset=UTF-8",
        "Cache-Control": "public, max-age=900, stale-while-revalidate=86400",
      },
    });
  });
}

serve(async (req: Request) => {
  const response = await getRoute(req);

  const allowedOrigin = getAllowedCorsOrigin(req.headers.get("origin"));
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    appendVaryHeader(response.headers, "Origin");
  }

  return response;
});

Deno.cron("FerryFetchJob", "0 * * * *", async () => {
  const ferries = [
    ["vangsnes", "hella"],
  ];

  for (const [from, to] of ferries) {
    await Ferjetider({ from, to });
    await Ferjetider({ from: to, to: from });
  }

  console.log("cron job executed");
});
