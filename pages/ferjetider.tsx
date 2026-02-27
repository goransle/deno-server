import { h } from "https://esm.sh/preact@10.25.3";

import { fetchFerriesCached, places } from "../ferryFetcher.ts";
import type { Driftsmelding } from "../ferryFetcher.ts";
import { Ferjeliste } from "./ferjeliste.tsx";

export type FerjetiderProps = {
  from?: string;
  to?: string;
  userLat?: number;
  userLon?: number;
};

const cams: Record<string, string> = {
  vangsnes: "https://webkamera.atlas.vegvesen.no/public/kamera?id=1429036_1",
  hella: "https://webkamera.atlas.vegvesen.no/public/kamera?id=1429039_1",
  dragsvik: "https://webkamera.atlas.vegvesen.no/public/kamera?id=1429040_1",
  mannheller: "https://webkamera.atlas.vegvesen.no/public/kamera?id=1429028_1",
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

type FerryTrip = {
  startTime: string;
  notices: { text?: string }[];
};

export type FerrySectionProps = {
  from: string;
  to: string;
  ferries: FerryTrip[];
  driftsmeldinger: Driftsmelding[];
  userLat?: number;
  userLon?: number;
};

function getLink(from: string, to: string) {
  const fromPlace = places[from];
  const toPlace = places[to];

  return `https://entur.no/reiseresultater?transportModes=car_ferry&date=${Date.now()}&tripMode=oneway&walkSpeed=1.3&minimumTransferTime=120&timepickerMode=departAfter&startId=${fromPlace.place}&startLabel=${fromPlace.name}&startLat=${fromPlace.coordinates.latitude}&startLon=${fromPlace.coordinates.longitude}&stopId=${toPlace.place}&stopLabel=${toPlace.name}&stopLat=${toPlace.coordinates.latitude}&stopLon=${toPlace.coordinates.longitude}`;
}

function hasUserCoordinates(userLat?: number, userLon?: number) {
  return Number.isFinite(userLat) && Number.isFinite(userLon);
}

function getRouteHref(
  from: string,
  to: string,
  userLat?: number,
  userLon?: number,
) {
  const url = new URL(`/ferjetider/${from}-${to}`, "https://ferjetider.local");

  if (hasUserCoordinates(userLat, userLon)) {
    url.searchParams.set("lat", String(userLat));
    url.searchParams.set("lon", String(userLon));
  }

  return `${url.pathname}${url.search}`;
}

function resolveRoute(
  from?: string,
  to?: string,
): { from: string; to: string } {
  const fallback = {
    from: "vangsnes",
    to: "hella",
  };

  if (!from || !to) {
    return fallback;
  }

  if (!places[from] || !places[to]) {
    return fallback;
  }

  return { from, to };
}

export function FerrySection(props: FerrySectionProps) {
  return (
    <section>
      <h2>
        <span className="ferry-from">
          {getPlaceName(props.from)}
        </span>{" "}
        to{" "}
        <span className="ferry-to">
          {getPlaceName(props.to)}
        </span>
        <a
          href={getRouteHref(
            props.to,
            props.from,
            props.userLat,
            props.userLon,
          )}
          className="swap-link"
        >
          Swap
        </a>
      </h2>
      <p className="info" />
      <ol style={{ listStyle: "square" }}>
        {(props.ferries ?? []).map(({ startTime, notices }, index) => {
          const noticeText = (notices ?? [])
            .map((notice) => notice.text?.trim())
            .filter(Boolean)
            .join(" · ");

          return (
            <li key={`${startTime}-${noticeText || index}`}>
              {formatTimestamp(startTime)}
              {noticeText && (
                <span className="notices">
                  {noticeText}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {props.driftsmeldinger.length > 0 && (
        <aside className="driftsmeldinger">
          <h3>Driftsmeldingar</h3>
          <ul>
            {props.driftsmeldinger.map((melding) => (
              <li key={melding.id}>
                <strong>{melding.summary}</strong>
                {melding.description && (
                  <span className="driftsmeldinger-description">
                    {" "}
                    {melding.description}
                  </span>
                )}
                {melding.infoLinks.length > 0 && (
                  <span className="driftsmeldinger-links">
                    {" "}
                    {melding.infoLinks.map((link) => (
                      <a key={link.uri} href={link.uri}>
                        {link.label ?? "Les meir"}
                      </a>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </aside>
      )}
      {cams[props.from] && (
        <details>
          <summary>View webcam</summary>
          <img
            loading="lazy"
            alt=""
            style={{ maxWidth: "100vw" }}
            src={cams[props.from]}
          />
        </details>
      )}
      <p>
        <a href={getLink(props.from, props.to)}>Open in Entur</a>
      </p>
    </section>
  );
}

export async function Ferjetider(props: FerjetiderProps) {
  const route = resolveRoute(props.from, props.to);
  const ferryData = {
    ...route,
    ...(await fetchFerriesCached(route).catch(() => ({
      ferries: [],
      driftsmeldinger: [],
    }))),
  };

  const ferries: FerryTrip[] = ferryData.ferries ?? [];
  const driftsmeldinger = ferryData.driftsmeldinger ?? [];
  const hasUserLocation = hasUserCoordinates(props.userLat, props.userLon);

  return (
    <html lang="en">
      <head>
        <title>Ferjetider, hej, hej, ferjetider</title>
        <meta charset="UTF-8" />

        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta httpEquiv="refresh" content="120" />

        <meta name="description" content="" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⛴️</text></svg>"
        />

        <style>
          {`
body {
    font-family: sans-serif;
    font-size: 1.4rem;
}
main {
    margin: 0 auto;
    max-width: 30em;
    display: flex;
    flex-direction: column;
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

.driftsmeldinger {
    font-size: .6em;
    margin-top: .5em;
    padding: .5em;
    border-left: .2em solid currentColor;
}

.driftsmeldinger ul {
    margin: 0;
    padding-left: 1em;
}

.driftsmeldinger-description,
.driftsmeldinger-links {
    display: block;
    margin-top: .2em;
}

.driftsmeldinger a {
    color: inherit;
}

#action-links, .page-actions {
    display: flex;
    flex-wrap: wrap;
    gap: .7em;
}

.route-picker {
    display: flex;
    gap: .5em;
    flex-wrap: wrap;
}

.route-picker label {
    display: inline-flex;
    flex-direction: column;
    font-size: .7em;
}

.route-picker select,
.route-picker button,
.page-actions button,
.page-actions a,
.swap-link {
    font-size: .7em;
}

.status-message {
    font-size: .7em;
}

.status-frame {
    border: 0;
    width: 100%;
}

.swap-link {
    margin-left: .5em;
}
`}
        </style>
      </head>
      <body>
        <section className="status-message">
          <iframe
            className="status-frame"
            src="/status-messages/index.html"
            title="General status messages"
            sandbox=""
          />
        </section>
        <section className="status-message">
          <iframe
            className="status-frame"
            src={`/status-messages/${ferryData.from}-${ferryData.to}.html`}
            title="Route-specific status messages"
            sandbox=""
          />
        </section>
        <h1 className="sr-only">Upcoming ferjetider</h1>
        <main>
          <section className="page-actions">
            <form className="route-picker" method="get" action="/ferjetider">
              <label>
                From
                <select name="from" value={ferryData.from}>
                  {Object.entries(places).map(([key, place]) => (
                    <option key={key} value={key}>{place.name}</option>
                  ))}
                </select>
              </label>
              <label>
                To
                <select name="to" value={ferryData.to}>
                  {Object.entries(places).map(([key, place]) => (
                    <option key={key} value={key}>{place.name}</option>
                  ))}
                </select>
              </label>
              <button type="submit">Show route</button>
              {hasUserLocation && (
                <input type="hidden" name="lat" value={String(props.userLat)} />
              )}
              {hasUserLocation && (
                <input type="hidden" name="lon" value={String(props.userLon)} />
              )}
            </form>
            <button id="geo-find-nearest" type="button">
              Find nearest crossing
            </button>
            <label>
              <input id="geo-auto-toggle" type="checkbox" />
              Auto-find nearest route
            </label>
          </section>

          <FerrySection
            from={ferryData.from}
            to={ferryData.to}
            ferries={ferries}
            driftsmeldinger={driftsmeldinger}
            userLat={props.userLat}
            userLon={props.userLon}
          />
          <section id="action-links">
            <a
              href={getRouteHref(
                ferryData.to,
                ferryData.from,
                props.userLat,
                props.userLon,
              )}
            >
              Swap places
            </a>
            <a href={getLink(ferryData.from, ferryData.to)}>Open in Entur</a>
          </section>
        </main>
        <aside>
          <nav>
            <h2>More crossings</h2>
            <Ferjeliste userLat={props.userLat} userLon={props.userLon} />
          </nav>
          <h2>Useful resources</h2>
          <ul>
            <li>
              <a href="https://www.vikjavev.no/">Vikjaveven</a>
            </li>
            <li>
              <a href="https://www.vegvesen.no/trafikk">Vegvesen trafikk</a>
            </li>
          </ul>
        </aside>
        <script src="/scripts/ferje-client-script.js" defer />
      </body>
    </html>
  );
}
