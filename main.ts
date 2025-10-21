import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
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
import { getFerryDistance } from "./ferryFetcher.ts";

const headers = new Headers();
headers.append("Content-Type", "text/html; charset=UTF-8");

// Add a route that responds with the current time

addRoute("GET", "/", async () => {
  const response = "<!DOCTYPE html>" + render(
    await Ferjetider({}),
  );

  return new Response(
    response,
    {
      headers,
    },
  );
});

addRoute("GET", "/ferjeliste", async () => {
  const response = "<!DOCTYPE html>" + render(
    await Ferjeliste({}),
  );

  return new Response(
    response,
    {
      headers,
    },
  );
});

addRoute("GET", "/ferjetider", async () => {
  const response = "<!DOCTYPE html>" + render(
    await Ferjetider({}),
  );

  return new Response(
    response,
    {
      headers,
    },
  );
});

addRoute("GET", "/ferjetider/:from-:to", async (_req, params) => {
  const response = "<!DOCTYPE html>" + render(
    await Ferjetider({ from: params?.from, to: params?.to }),
  );

  return new Response(
    response,
    {
      headers,
    },
  );
});

addRoute("GET", "/api/more-ferries/:from-:to/:cursor", async (_req, params) => {
  const { from, to, cursor } = params ?? {};
  
  if (!from || !to || !cursor) {
    return new Response("Missing parameters", { status: 400 });
  }

  const { fetchFerriesCached } = await import("./ferryFetcher.ts");
  const data = await fetchFerriesCached({ from, to, cursor: decodeURIComponent(cursor) });

  if (data) {
    const responseHeaders = new Headers();
    responseHeaders.append("Content-Type", "text/html; charset=UTF-8");
    
    const ferriesHtml = (data.ferries ?? []).map(({ startTime, notices }, index) => {
      const noticeText = (notices ?? [])
        .map((notice) => notice.text?.trim())
        .filter(Boolean)
        .join(" · ");
      
      const formattedTime = (new Date(startTime)).toLocaleTimeString(
        "no-NO",
        { timeZone: "Europe/Oslo" }
      ).replace(":00", "");

      return `<li>${formattedTime}${noticeText ? `<span class="notices">${noticeText}</span>` : ""}</li>`;
    }).join("");

    const fetchMoreButton = data.nextCursor ? 
      `<button hx-get="/api/more-ferries/${from}-${to}/${encodeURIComponent(data.nextCursor)}" hx-swap="outerHTML" hx-indicator="#htmx-indicator" id="fetch-more-button">Fetch More ⬇️</button>` : 
      "";

    return new Response(
      ferriesHtml + fetchMoreButton,
      { headers: responseHeaders }
    );
  }

  return new Response("", { status: 404 });
});

addRoute(
  "GET",
  "/ferje-directions/:ferjenavn/:latlon",
  async (_req, params) => {
    console.log(params);

    if (params?.ferjenavn && params?.latlon) {
      const { ferjenavn, latlon } = params;
      const directions = await getFerryDistance(ferjenavn, latlon);
      if (directions) {
        const headers = new Headers();
        headers.append("Content-Type", "application/json; charset=UTF-8");

        return new Response(
          JSON.stringify(directions),
          {
            headers,
          },
        );
      }
    }

    return new Response();
  },
);

addRoute(
    "GET",
    "/status-messages/*",
    async function (req){
        const filePath = "./public/status-messages/" + req.url.split("/status-messages/")[1];
        const file = await Deno.readTextFile(filePath).catch(()=> null);
        if (file) {
            const headers = new Headers();
            headers.append("Content-Type", "text/html; charset=UTF-8");
            return new Response(file, { headers });
        }

        return new Response();
    }
)

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

scripts.forEach(async (scriptObj) => {
  const code = await Deno.readFile("./dist/scripts/" + scriptObj.name + ".js");

  // TOOD: do a bundle before running main
  addRoute("GET", `/scripts/${scriptObj.name}.js`, (_req, _params) => {
    const headers = new Headers();
    headers.append("Content-Type", "application/javascript; charset=UTF-8");

    return new Response(
      code,
      {
        headers,
      },
    );
  });
});

serve(async (req: Request) => {
  const response = await getRoute(req);

  const allowedOrigins = [
    "localhost:8000",
    "goransle.omg.lol",
    "ferjetider.goransle.no",
    "www.goransle.no"
  ];

  const origin = req.headers.get("host");

  console.log(origin);
  // Allow specific origins or any deno.dev subdomain
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith(".deno.dev") || origin === "deno.dev")) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      "*",
    );
    response.headers.set(
      "Vary",
      "Origin",
    );
    response.headers.set(
      "Keep-Alive",
      "timeout=2, max=100",
    );
    response.headers.set(
      "Connection",
      "Keep-Alive",
    );

    return response;
  } else return new Response();
});


Deno.cron("FerryFetchJob", "0 * * * *", async() => {
    const ferries = [
        ['vangsnes', 'hella']
    ];

    for (const [from, to] of ferries){
        await Ferjetider({ from, to });
        await Ferjetider({from: to, to: from });
    }

  console.log("cron job executed");
});
