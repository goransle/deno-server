import { serve } from "https://deno.land/std@0.155.0/http/server.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";

import { addRoute, getRoute } from "./router.ts";

// Load config from .env files
// wrap in try cause files don't work on server
try {
  config({ safe: true, export: true });
} catch {
  console.log("No .env support");
}

addRoute("GET", "/", async (req, params) => {
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("XATA_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: '{"columns":["*","dose.*"],"page":{"size":15}}',
  };

  const response = await (fetch(
    "https://goransle-s-workspace-0544ur.eu-west-1.xata.sh/db/databetus:main/tables/databetus/query",
    options,
  )
    .then((response) => response.json())
    .then((response) => JSON.stringify(response))
    .catch((err) => console.error(err)));
  if (response) {
    return new Response(response);
  }
});

async function getEmojiRecords() {
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("XATA_API_KEY")}`,
      "Content-Type": "application/json",
      body: '{"page":{"size":99}}',
    },
  };

  const response = await fetch(
    `https://goransle-s-workspace-0544ur.eu-west-1.xata.sh/db/db-lol:main/tables/emojiClicks/query`,
    options,
  )
    .then((response) => response.json())
    .then((response) => response.records)
    .catch((err) => console.error(err));

  return response;
}

// TODO: should be a POST
addRoute("GET", "/addEmoji/:emoji", async (req, params) => {
  console.log(params);

  if (params?.emoji) {
    const emoji = decodeURI(params.emoji);
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("XATA_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emoji: emoji,
      }),
    };

    const response = await fetch(
      "https://goransle-s-workspace-0544ur.eu-west-1.xata.sh/db/db-lol:main/tables/emojiClicks/data?columns=id",
      options,
    )
      .then((response) => response.json())
      .then((response) => JSON.stringify(response))
      .catch((err) => console.error(err));
    if (response) {
      return new Response(response);
    }
  }

  return new Response("lol");
});

addRoute("GET", "/click/:emoji", async (req, params) => {
  if (params?.emoji) {
    // TODO: this url :/
    const emojis = await getEmojiRecords();

    if (emojis) {
      const { id, clicks } = emojis.find((emojiObj) =>
        emojiObj.emoji === decodeURI(params.emoji)
      );

      const options = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("XATA_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clicks: clicks + 1,
        }),
      };

      const response = await fetch(
        `https://goransle-s-workspace-0544ur.eu-west-1.xata.sh/db/db-lol:main/tables/emojiClicks/data/${id}?columns=emoji`,
        options,
      )
        .then((response) => response.json())
        .then((response) => JSON.stringify(response))
        .catch((err) => console.error(err));
      if (response) {
        return new Response(response);
      }
    }
  }

  return new Response("lol");
});

// TODO add some caching of keys
addRoute("GET", "/emojis", async (req, params) => {
  const response = await getEmojiRecords();
  if (response) {
    return new Response(JSON.stringify(response));
  }

  return new Response("lol");
});

serve(async (req: Request) => {
  const response = await getRoute(req);

  const allowedOrigins = [
    "localhost:8000",
    "goransle.omg.lol",
  ];

  const origin = req.headers.get("host");
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      origin,
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
  }
  else return new Response();
});
