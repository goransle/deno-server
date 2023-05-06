import { addRoute } from "./router.ts";
import { getNextFerries } from "./ferryFetcher.ts";

const boilerplate = ({ title, body, style }) => `
<!DOCTYPE html>
<html lang="en">

<head>

  <meta charset="UTF-8" />

  <title>${title}</title>

  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <meta name="description" content="" />

  <link rel="icon" href="favicon.png">
  <style>
  ${style}
  </style>
</head>

<body>
${body}
</body>

</html>

`;

const cachedResponse: Record<string, string> = {};

addRoute("GET", "/ferries", async (_req) => {
    const response: Record<string, string> = {};

    if (cachedResponse) {
        if (cachedResponse.body && cachedResponse.timestamp) {
            // TODO: add env variable for this
            const isStale =
                new Date() - new Date(cachedResponse.timestamp) > (2 * 60 * 1000);

            if (!isStale) {
                console.log("using cached response from " + cachedResponse.timestamp);
                response.body = cachedResponse.body;
            }
        }
    }

    if (!response.body) {
        const ferriesFromVangsnes = await getNextFerries({
            from: "vangsnes",
            to: "hella",
        });

        const ferriesFromHella = await getNextFerries({
            from: "hella",
            to: "vangsnes",
        });

        response.body = boilerplate({
            style: `
@media (prefers-color-scheme: dark) {
    body {
        background-color: black;
        color: white;
    }
}
body {
    font-family: sans-serif;
    font-size: 2em;
}
main {
    margin: 0 auto;
    max-width: 30em;
    display: flex;
    flex-wrap: wrap;
    gap: 1em;
}

            `,
            body: `<main>
                <section>
                <h2>Vangsnes to Hella</h2>
                    <ul>
                    ${ferriesFromVangsnes.map((ferry) => {
                return `<li>${(new Date(ferry)).toLocaleString(
                    "no-NO",
                    { timeZone: "Europe/Oslo" },
                )
                    }</li>`;
            }).join("")
                }
                    </ul>
                    </section>

                    <section>
                <h2>Hella to Vangsnes</h2>
                    <ul>
                    ${ferriesFromHella.map((ferry) => {
                    return `<li>${(new Date(ferry)).toLocaleString(
                        "no-NO",
                        { timeZone: "Europe/Oslo" },
                    )
                        }</li>`;
                }).join("")
                }
                    </ul>
                    </section>
                    </main>`,
            title: "Ferjetider, hei, hei, ferjetider",
        });

        cachedResponse.body = response.body;
        cachedResponse.timestamp = (new Date()).toISOString();
    }

    const responseBody = new TextEncoder()
        .encode(response.body);

    return new Response(responseBody, {
        headers: {
            "Content-Type": "text/html",
        },
    });
});
