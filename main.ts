import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import { addRoute, getRoute } from "./router.ts";
import { registerFerjetiderRoutes } from "./routes/ferjetider.ts";
import { registerStatusRoutes } from "./routes/status.ts";
import { registerEmojiRoutes } from "./routes/emojis.ts";
import { registerMiscRoutes } from "./routes/misc.ts";
import {
  appendVaryHeader,
  getAllowedCorsOrigin,
} from "./utils/http.ts";
import { Ferjetider } from "./pages/ferjetider.tsx";

import scripts from "./scripts.json" with { type: "json" };

// Load config from .env files
// wrap in try cause files don't work on server
try {
  config({ safe: true, export: true });
} catch {
  console.log("No .env support");
}

registerFerjetiderRoutes();
registerStatusRoutes();
registerEmojiRoutes();
registerMiscRoutes();

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

Deno.serve(async (req: Request) => {
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
