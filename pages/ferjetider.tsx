import { h } from "https://esm.sh/preact";

import { fetchFerriesCached, places } from "../ferryFetcher.ts";

export type FerjetiderProps = {
  from?: string;
  to?: string;
};

export async function Ferjetider(props: FerjetiderProps) {
  const arr = (props.from && props.to)
    ? [
      {
        from: props.from,
        to: props.to,
      },
      {
        from: props.to,
        to: props.from,
      },
    ]
    : [
      {
        from: "vangsnes",
        to: "hella",
      },
      {
        from: "hella",
        to: "vangsnes",
      },
    ];

  const ferryData = await Promise.all(arr.map(async (fromTo) => {
    return {
      ...fromTo,
      ...(await fetchFerriesCached(fromTo)),
    };
  }));

  return (
    <html lang="en">
      <head>
        <title>{"Ferjetider, hej, hej, ferjetider"}</title>
        <meta charset="UTF-8" />

        <meta name="viewport" content="width=device-width,initial-scale=1" />

        <meta name="description" content="" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⛴️</text></svg>"
        />

        <style>
          {`
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
`}
        </style>
      </head>
      <body>
        <main>
          {ferryData.map((data) => {
            return (
              <section>
                <h2>{places[data.from].name} to {places[data.to].name}</h2>
                <ol>
                  {data.ferries
                    ?.map((timestamp) => (
                      <li>
                        {(new Date(timestamp)).toLocaleTimeString(
                          "no-NO",
                          { timeZone: "Europe/Oslo" },
                        )}
                      </li>
                    ))}
                </ol>
              </section>
            );
          })}
        </main>
      </body>
    </html>
  );
}
