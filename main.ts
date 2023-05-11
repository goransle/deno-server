import { serve } from "https://deno.land/std@0.155.0/http/server.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { render } from "https://esm.sh/preact-render-to-string@v6.0.3";
import { addRoute, getRoute } from "./router.ts";

import { Test } from "./pages/test.tsx";

import * as esbuild from "https://deno.land/x/esbuild@v0.17.18/mod.js";

// Load config from .env files
// wrap in try cause files don't work on server
try {
  config({ safe: true, export: true });
} catch {
  console.log("No .env support");
}

import "./emojistuff.ts";
import { Ferjetider } from "./pages/ferjetider.tsx";

const headers = new Headers();
headers.append("Content-Type", "text/html; charset=UTF-8");

// Add a route that responds with the current time

addRoute("GET", "/", () => {
  const response = render(
    Test({
      text: "hello",
    }),
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

const scripts = [
  {
    localPath: "./pages/ferje-client-script.ts",
    name: "ferje-client-script",
  },
];

// scripts.forEach(async (scriptObj) => {
//   const built = await esbuild.build({
//     entryPoints: [scriptObj.localPath],
//     bundle: true,
//     outdir: "./tmp/scripts/",
//   })
//     .catch((error) => {
//       console.error(error);
//       return { code: "" };
//     });
//
//   esbuild.stop();
//
//   console.log(built)
//
//   const code = await Deno.readFile('./tmp/scripts/' + scriptObj.name + '.js');
//
//
//   // TOOD: do a bundle before running main
//   addRoute("GET", `/scripts/${scriptObj.name}.js`, (_req, _params) => {
//     const headers = new Headers();
//     headers.append("Content-Type", "application/javascript; charset=UTF-8");
//
//     return new Response(
//       code,
//       {
//         headers,
//       },
//     );
//   });
// });

serve(async (req: Request) => {
  const response = await getRoute(req);

  const allowedOrigins = [
    "localhost:8000",
    "goransle.omg.lol",
    "goransle-deno-server.deno.dev",
    "goransle.deno.dev",
  ];

  const origin = req.headers.get("host");

  console.log(origin);
  if (origin && allowedOrigins.includes(origin)) {
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
