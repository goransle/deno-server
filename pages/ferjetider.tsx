import { h } from "https://esm.sh/preact";

import { fetchFerriesCached, places } from "../ferryFetcher.ts";

export type FerjetiderProps = {
  from?: string;
  to?: string;
};

const ferryLines = [
  "vangsnes-hella",
  "hella-dragsvik",
  "vangsnes-dragsvik",
  "fodnes-mannheller",
];

export function FerryList() {
  return (
    <ul>
      {ferryLines.map(
        (line) => (
          <li>
            <a href={"/ferjetider/" + line}>
              {line.split("-")
                .map((place) =>
                  place
                    .charAt(0)
                    .toUpperCase() + place.slice(1)
                ).join(" - ")}
            </a>
          </li>
        ),
      )}
    </ul>
  );
}

export function getPlaceName(place: string): string | null {
  if (places[place]) {
    return places[place].name;
  }

  return null;
}

export function formatTimestamp(timestamp: string) {
  return (new Date(timestamp)).toLocaleTimeString(
    "no-NO",
    { timeZone: "Europe/Oslo" },
  );
}

export type FerrySectionProps = {
  from: string;
  to: string;
  ferries: string[];
};

export function FerrySection(props: FerrySectionProps) {
  return (
    <section>
      <h2>
        <span className={"ferry-from"} data-original={props.from}>
          {getPlaceName(props.from)}
        </span>{" "}
        to{" "}
        <span className={"ferry-to"} data-original={props.to}>
          {getPlaceName(props.to)}
        </span>
      </h2>
      <ol>
        {props.ferries
          .map((timestamp) => (
            <li>
              {formatTimestamp(timestamp)}
            </li>
          ))}
      </ol>
    </section>
  );
}

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
      ...(await fetchFerriesCached(fromTo).catch(() => ({
        ferries: [],
      }))),
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

.sr-only { 
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    border: 0;
}
`}
        </style>
      </head>
      <body>
        <h1 className={"sr-only"}>Upcoming ferjetider</h1>
        <main>
          {ferryData.map((data) => {
            return (
              <FerrySection
                from={data.from}
                to={data.to}
                ferries={data.ferries as string[]}
              />
            );
          })}
        </main>
        <button id="refetch-button">Refetch</button>
        <aside>
          <nav>
            <h2>More crossings</h2>
            <FerryList />
          </nav>
        </aside>
        <dialog id="placeDialog">
          <form>
            <p>
              <label>
                Select a different place
                <select>
                  {Object.entries(places)
                    .map(([key, place]) => {
                      return <option value={key}>{place.name}</option>;
                    })}
                </select>
              </label>
            </p>
            <div>
              <button value="cancel" formmethod="dialog">Cancel</button>
              <button id="confirmBtn" value="default">Submit</button>
            </div>
          </form>
        </dialog>
        <script src="/scripts/ferje-client-script.js"></script>
      </body>
    </html>
  );
}
