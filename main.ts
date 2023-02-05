import { serve } from "https://deno.land/std@0.155.0/http/server.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";

// Load config from .env files
// wrap in try cause files don't work on server
try {
    config({safe: true, export: true});
} catch {
    console.log('No .env support')
}

const options = {
  method: "POST",
  headers: {
    Authorization: "Bearer " + Deno.env.get('XATA_API_KEY'),
    "Content-Type": "application/json",
  },
  body: '{"columns":["*","dose.*"],"page":{"size":15}}',
};

const response =
  await (fetch(
    "https://goransle-s-workspace-0544ur.eu-west-1.xata.sh/db/databetus:main/tables/databetus/query",
    options,
  )
    .then((response) => response.json())
    .then((response) => JSON.stringify(response))
    .catch((err) => console.error(err)));

serve((req: Request) => new Response(response));
