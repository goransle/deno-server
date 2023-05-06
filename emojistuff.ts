import { addRoute } from "./router.ts";

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
addRoute("GET", "/addEmoji/:emoji", async (_req, params) => {
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

addRoute("GET", "/click/:emoji", async (_req, params) => {
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
addRoute("GET", "/emojis", async (_req, _params) => {
    const response = await getEmojiRecords();
    if (response) {
        return new Response(JSON.stringify(response));
    }

    return new Response("lol");
});
