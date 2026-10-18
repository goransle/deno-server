import { addRoute } from "../router.ts";

async function getEmojiRecords() {
  const apiKey = Deno.env.get("XATA_API_KEY");
  if (!apiKey) {
    return null;
  }

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    .catch((err) => {
      console.error(err);
      return null;
    });

  return response;
}

export function registerEmojiRoutes() {
  addRoute("GET", "/addEmoji/:emoji", async (_req, params) => {
    const apiKey = Deno.env.get("XATA_API_KEY");
    if (!apiKey) {
      return new Response("Service unavailable", { status: 503 });
    }

    if (params?.emoji) {
      const emoji = decodeURI(params.emoji);
      const options = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
        .catch((err) => {
          console.error(err);
          return null;
        });
      if (response) {
        return new Response(response);
      }
    }

    return new Response("lol");
  });

  addRoute("GET", "/click/:emoji", async (_req, params) => {
    const apiKey = Deno.env.get("XATA_API_KEY");
    if (!apiKey) {
      return new Response("Service unavailable", { status: 503 });
    }

    if (params?.emoji) {
      const emojis = await getEmojiRecords();

      if (emojis) {
        const found = emojis.find((emojiObj: { emoji: string }) =>
          emojiObj.emoji === decodeURI(params.emoji)
        );

        if (!found) {
          return new Response("Emoji not found", { status: 404 });
        }

        const { id, clicks } = found;

        const options = {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
          .catch((err) => {
            console.error(err);
            return null;
          });
        if (response) {
          return new Response(response);
        }
      }
    }

    return new Response("lol");
  });

  addRoute("GET", "/emojis.json", async () => {
    const response = await getEmojiRecords();
    if (response) {
      return new Response(JSON.stringify(response));
    }

    return new Response("lol");
  });

  addRoute("GET", "/emojis", async () => {
    const emojis = await getEmojiRecords();

    if (emojis) {
      let html = "<!DOCTYPE html><script src='/scripts/htmx.js'></script>";

      html += emojis.map((emojiObj: { emoji: string; clicks: number }) => {
        return `<button hx-get="/click/${emojiObj.emoji}" hx-target="this">${emojiObj.emoji} ${emojiObj.clicks}</button>`;
      }).join("");

      return new Response(html);
    }

    return new Response("lol");
  });
}
