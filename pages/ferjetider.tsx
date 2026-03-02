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
:root {
    /* Light mode colors */
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --bg-tertiary: #e9ecef;
    --text-primary: #212529;
    --text-secondary: #495057;
    --text-muted: #6c757d;
    --border-color: #dee2e6;
    --accent-primary: #0d6efd;
    --accent-hover: #0b5ed7;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
    --ferry-from-color: #0d6efd;
    --ferry-to-color: #198754;
    --notice-bg: #fff3cd;
    --notice-border: #ffc107;
    --warning-bg: #f8d7da;
    --warning-border: #dc3545;
}

@media (prefers-color-scheme: dark) {
    :root {
        /* Dark mode colors */
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d2d2d;
        --bg-tertiary: #3a3a3a;
        --text-primary: #e9ecef;
        --text-secondary: #ced4da;
        --text-muted: #adb5bd;
        --border-color: #495057;
        --accent-primary: #4dabf7;
        --accent-hover: #74c0fc;
        --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
        --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
        --ferry-from-color: #4dabf7;
        --ferry-to-color: #51cf66;
        --notice-bg: #3d3000;
        --notice-border: #ffc107;
        --warning-bg: #4a1c1c;
        --warning-border: #dc3545;
    }
}

* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    margin: 0;
    padding: 1rem;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
}

main {
    margin: 0 auto;
    max-width: 50rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

h1, h2, h3 {
    margin: 0;
    line-height: 1.2;
}

h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
}

h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

section {
    background-color: var(--bg-secondary);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
    transition: background-color 0.3s ease;
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

.ferry-from {
    color: var(--ferry-from-color);
    font-weight: 600;
}

.ferry-to {
    color: var(--ferry-to-color);
    font-weight: 600;
}

ol {
    list-style: none;
    padding: 0;
    margin: 0;
}

ol li {
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    background-color: var(--bg-primary);
    border-radius: 0.5rem;
    border-left: 3px solid var(--accent-primary);
    font-size: 1.1rem;
    font-weight: 500;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

ol li:hover {
    transform: translateX(4px);
    box-shadow: var(--shadow-md);
}

.notices {
    display: block;
    font-size: 0.85rem;
    margin-top: 0.25rem;
    color: var(--text-secondary);
    font-weight: 400;
}

.driftsmeldinger {
    font-size: 0.9rem;
    margin-top: 1rem;
    padding: 1rem;
    background-color: var(--warning-bg);
    border-left: 4px solid var(--warning-border);
    border-radius: 0.5rem;
}

.driftsmeldinger h3 {
    margin-top: 0;
    color: var(--warning-border);
}

.driftsmeldinger ul {
    margin: 0;
    padding-left: 1.5rem;
}

.driftsmeldinger li {
    margin-bottom: 0.5rem;
}

.driftsmeldinger-description,
.driftsmeldinger-links {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.9rem;
}

.driftsmeldinger a {
    color: var(--accent-primary);
    text-decoration: underline;
}

#action-links, .page-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
}

.route-picker {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: flex-end;
}

.route-picker label {
    display: inline-flex;
    flex-direction: column;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-secondary);
}

.route-picker select,
.route-picker button,
.page-actions button,
button {
    padding: 0.5rem 1rem;
    font-size: 0.95rem;
    font-weight: 500;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
}

.route-picker select {
    background-color: var(--bg-primary);
    min-width: 150px;
}

.route-picker button,
.page-actions button,
button[type="submit"],
button[type="button"] {
    background-color: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
}

.route-picker button:hover,
.page-actions button:hover,
button[type="submit"]:hover,
button[type="button"]:hover {
    background-color: var(--accent-hover);
    border-color: var(--accent-hover);
    transform: translateY(-1px);
}

.route-picker select:hover,
.route-picker select:focus {
    border-color: var(--accent-primary);
    outline: none;
}

a {
    color: var(--accent-primary);
    text-decoration: none;
    transition: color 0.2s ease;
}

a:hover {
    color: var(--accent-hover);
    text-decoration: underline;
}

.page-actions a,
#action-links a {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    transition: background-color 0.2s ease, transform 0.1s ease;
}

.page-actions a:hover,
#action-links a:hover {
    background-color: var(--bg-primary);
    transform: translateY(-1px);
    text-decoration: none;
}

.swap-link {
    margin-left: 0.75rem;
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    color: var(--text-primary);
    text-decoration: none;
}

.swap-link:hover {
    background-color: var(--bg-primary);
    text-decoration: none;
}

.status-message {
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
}

.status-frame {
    border: 0;
    width: 100%;
    background-color: transparent;
}

details {
    margin-top: 1rem;
}

details summary {
    cursor: pointer;
    padding: 0.5rem;
    background-color: var(--bg-tertiary);
    border-radius: 0.375rem;
    font-weight: 500;
    transition: background-color 0.2s ease;
}

details summary:hover {
    background-color: var(--bg-primary);
}

details img {
    margin-top: 0.75rem;
    border-radius: 0.5rem;
}

aside {
    margin-top: 2rem;
}

aside nav {
    background-color: var(--bg-secondary);
    padding: 1.5rem;
    border-radius: 0.75rem;
    margin-bottom: 1.5rem;
}

aside ul {
    line-height: 1.8;
}

aside ul li {
    margin-bottom: 0.5rem;
}

.page-actions label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
    cursor: pointer;
}

input[type="checkbox"] {
    width: 1.1rem;
    height: 1.1rem;
    cursor: pointer;
}

@media (max-width: 640px) {
    body {
        padding: 0.75rem;
    }
    
    section {
        padding: 1rem;
    }
    
    .route-picker {
        width: 100%;
    }
    
    .route-picker label,
    .route-picker select {
        flex: 1;
        min-width: 0;
    }
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
