import { h } from "https://esm.sh/preact@10.25.3";

import { fetchFerriesCached, places } from "../ferryFetcher.ts";

export type FerjetiderProps = {
  from?: string;
  to?: string;
};

const cams = {
  "vangsnes": "https://webkamera.atlas.vegvesen.no/public/kamera?id=1429036_1",
  "hella": "https://webkamera.atlas.vegvesen.no/public/kamera?id=1429039_1",
  "dragsvik": "https://webkamera.atlas.vegvesen.no/public/kamera?id=1429040_1",
  "mannheller":
    "https://webkamera.atlas.vegvesen.no/public/kamera?id=1429028_1",
};

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
  ).replace(":00", "");
}

export function SettingsDialog() {
  return (
    <dialog id="settingsDialog">
      <form>
        <p>
          <label>
            Use geolocation
          </label>
          <input
            type="checkbox"
            id="geolocate-checkbox"
            name="geolocate"
            value="geolocate"
          />
        </p>
        <div>
          <button value="cancel" formmethod="dialog">Cancel</button>
          <button id="settingsSave" value="default">Save</button>
        </div>
      </form>
    </dialog>
  );
}

export type FerrySectionProps = {
  from: string;
  to: string;
  ferries: string[];
};

function getLink(from: string, to: string) {
    const fromPlace = places[from];
    const toPlace = places[to];

    return `https://entur.no/reiseresultater?transportModes=car_ferry&date=${Date.now()}tripMode=oneway&walkSpeed=1.3&minimumTransferTime=120&timepickerMode=departAfter&startId=${fromPlace.place}&startLabel=${fromPlace.name}&startLat=${fromPlace.coordinates.latitude}&startLon=${fromPlace.coordinates.longitude}&stopId=${toPlace.place}&stopLabel=${toPlace.name}&stopLat=${toPlace.coordinates.latitude}&stopLon=${toPlace.coordinates.longitude}`;
}

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
        <span>
          <button
            hx-swap="outerHTML"
            hx-push-url="true"
            hx-indicator="#htmx-indicator"
            hx-get={`/ferjetider/${props.to}-${props.from}`}
            hx-target="body"
          >
            🔀
          </button>
        </span>
      </h2>
      <p className="info"></p>
      <ol style={{ listStyle: "square" }}>
        {props.ferries
          ?.map(({startTime, notices}) => (
              <li>
                  {formatTimestamp(startTime)}
                  {notices.length && <span className="notices">{notices.map(n => n.text).join('\n')}</span>}
              </li>
          ))}
      </ol>
      {cams[props.from] && (
        <details>
          <summary>View webcam</summary>
          <img
            loading="lazy"
            alt=""
            style={{ maxWidth: "100vw" }}
            src={cams[props.from]}
          >
          </img>
        </details>
      )}
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
    ]
    : [
      {
        from: "vangsnes",
        to: "hella",
      },
    ];

  const [ferryData] = await Promise.all(arr.map(async (fromTo) => {
    return {
      ...fromTo,
      ...(await fetchFerriesCached(fromTo).catch(() => ({
        ferries: [],
      }))),
    };
  }));

  console.log(ferryData);

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

.notices {
    font-size: .7em;
    margin: auto .5em;
}

#action-links {
    display: flex;
    gap: 1em;
    a {
        font-size: 0.8em;
    }

    button {
        button-style: none;
    }
}
`}
        </style>
        <script src="/scripts/htmx.js"></script>
      </head>
      <body
        hx-trigger="load delay:2m"
        hx-get={`/ferjetider/${ferryData.from}-${ferryData.to}`}
      >

      <div hx-get="/status-messages/index.html"
          hx-trigger="load"
          hx-swap="innerHTML"
          >
       </div>
      <div hx-get={`/status-messages/${ferryData.from}-${ferryData.to}.html`}
          hx-trigger="load"
          hx-swap="innerHTML"
          >
       </div>
       <div id="htmx-indicator" class="htmx-indicator">Loading...</div>
        <h1 className={"sr-only"}>Upcoming ferjetider</h1>
        <main>
          <FerrySection
            from={ferryData.from}
            to={ferryData.to}
            ferries={ferryData.ferries as string[]}
          />
          <section id="action-links">
              <button
                hx-swap="outerHTML"
                hx-push-url="true"
                hx-get={`/ferjetider/${ferryData.to}-${ferryData.from}`}
                hx-target="body"
                hx-indicator="#htmx-indicator"
              >
                Swap places 🔄
              </button>
              <a href={getLink(ferryData.from, ferryData.to)}>Open in Entur</a>
          </section>
        </main>
        <aside>
          <nav>
            <h2>More crossings</h2>
            <div hx-get="/ferjeliste" hx-trigger="load"></div>
          </nav>
          <h2>Useful resources</h2>
          <ul>
            <li><a href="https://www.vikjavev.no/">Vikjaveven</a></li>
            <li><a href="https://www.vegvesen.no/trafikk">Vegvesen trafikk</a></li>
          </ul>
        </aside>
        <button id="settings-toggle">🛠️</button>
        <SettingsDialog />
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
