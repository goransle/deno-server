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
  vangsnes: "https://kamera.atlas.vegvesen.no/api/images/1429036_1",
  hella: "https://kamera.atlas.vegvesen.no/api/images/1429039_1",
  dragsvik: "https://kamera.atlas.vegvesen.no/api/images/1429040_1",
  mannheller: "https://kamera.atlas.vegvesen.no/api/images/1429028_1",
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
    { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" },
  );
}

export function formatCountdown(startTime: string, now = Date.now()) {
  const minutes = Math.round((new Date(startTime).getTime() - now) / 60000);

  if (minutes < 1) {
    return "departing now";
  }

  if (minutes < 60) {
    return `in ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `in ${hours} h ${rest} min` : `in ${hours} h`;
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
  const now = Date.now();
  const nextIndex = (props.ferries ?? []).findIndex(
    (ferry) => new Date(ferry.startTime).getTime() > now,
  );
  const nextFerry = nextIndex >= 0 ? props.ferries[nextIndex] : null;

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
      {nextFerry
        ? (
          <p className="info">
            Next departure{" "}
            <strong>{formatTimestamp(nextFerry.startTime)}</strong>{" "}
            <span
              className="countdown"
              data-start-time={nextFerry.startTime}
            >
              {formatCountdown(nextFerry.startTime)}
            </span>
          </p>
        )
        : (
          <p className="info">No upcoming departures found</p>
        )}
      <ol>
        {(props.ferries ?? []).map(({ startTime, notices }, index) => {
          const noticeText = (notices ?? [])
            .map((notice) => notice.text?.trim())
            .filter(Boolean)
            .join(" · ");

          const state = index === nextIndex
            ? "next"
            : new Date(startTime).getTime() <= now
            ? "past"
            : null;

          return (
            <li
              key={`${startTime}-${noticeText || index}`}
              className={state ?? undefined}
            >
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
    color-scheme: light dark;
    --night: #061018;
    --deep-water: #0a2233;
    --panel: rgba(10, 34, 51, .84);
    --panel-strong: #102f45;
    --line: rgba(125, 231, 232, .28);
    --text: #e6f7f4;
    --muted: #9fc2c0;
    --signal: #7de7e8;
    --signal-strong: #a9f5ef;
    --warning: #ffd166;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    font-family: "Avenir Next", Futura, "Trebuchet MS", sans-serif;
    font-size: 1.4rem;
    line-height: 1.5;
    color: var(--text);
    background:
        radial-gradient(circle at 12% -10%, rgba(125, 231, 232, .22), transparent 34rem),
        radial-gradient(circle at 88% 8%, rgba(255, 209, 102, .11), transparent 26rem),
        linear-gradient(150deg, var(--night) 0%, #071a27 48%, #02080d 100%);
    min-height: 100vh;
    padding: clamp(1rem, 4vw, 3rem) 1rem;
}

body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
        linear-gradient(115deg, transparent 0 48%, rgba(125, 231, 232, .055) 48% 50%, transparent 50%),
        repeating-linear-gradient(165deg, rgba(255, 255, 255, .025) 0 1px, transparent 1px 14px);
    opacity: .75;
}

body > * {
    position: relative;
}

main,
body > aside,
.status-message {
    width: min(100%, 30em);
    margin-inline: auto;
}

main {
    display: flex;
    flex-direction: column;
    gap: 1em;
    padding: clamp(1rem, 4vw, 1.75rem);
    background: linear-gradient(145deg, rgba(10, 34, 51, .94), rgba(5, 20, 30, .9));
    border: 1px solid var(--line);
    border-radius: 1.4rem;
    box-shadow: 0 1.5rem 5rem rgba(0, 0, 0, .45), inset 0 1px rgba(255, 255, 255, .08);
}

main > section,
main section section,
details,
body > aside {
    padding: .9rem;
    background: rgba(6, 18, 27, .48);
    border: 1px solid rgba(125, 231, 232, .16);
    border-radius: 1rem;
}

h2,
h3 {
    margin: 0 0 .45em;
    line-height: 1.1;
    letter-spacing: -.03em;
}

h2 {
    font-size: clamp(1.7rem, 9vw, 2.55rem);
    text-wrap: balance;
}

.ferry-from {
    color: var(--signal-strong);
}

.ferry-to {
    color: var(--warning);
}

h3 {
    font-size: 1em;
}

p,
ol,
ul {
    margin-top: .5em;
}

ol {
    list-style: square;
    font-size: clamp(1.8rem, 10vw, 3rem);
    font-weight: 700;
    letter-spacing: -.04em;
    line-height: 1.25;
}

li::marker {
    color: var(--signal);
}

li.past {
    color: var(--muted);
    font-weight: 400;
    opacity: .55;
}

li.next {
    color: var(--signal-strong);
    text-shadow: 0 0 1.4rem rgba(125, 231, 232, .4);
}

.info {
    margin: 0 0 .25em;
    color: var(--muted);
    font-size: .75em;
}

.info strong {
    color: var(--text);
}

.countdown {
    color: var(--signal);
    font-weight: 700;
}

a {
    color: var(--signal-strong);
    text-decoration-color: rgba(169, 245, 239, .42);
    text-underline-offset: .18em;
}

a:hover,
a:focus-visible {
    color: var(--warning);
}

button,
select,
input {
    font: inherit;
}

select,
button {
    min-height: 2.6rem;
    color: var(--text);
    background: rgba(125, 231, 232, .1);
    border: 1px solid var(--line);
    border-radius: .75rem;
}

select {
    padding-inline: .65rem;
}

button {
    padding-inline: .9rem;
    cursor: pointer;
}

button:hover,
button:focus-visible {
    background: rgba(125, 231, 232, .2);
    border-color: var(--signal);
}

input[type="checkbox"] {
    width: 1.1em;
    height: 1.1em;
    accent-color: var(--signal);
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
    display: block;
    color: var(--warning);
    font-size: .35em;
    font-weight: 600;
    letter-spacing: 0;
    margin: .25em 0 0;
}

.driftsmeldinger {
    font-size: .6em;
    margin-top: .8em;
    padding: .75em .9em;
    color: #ffe7a3;
    background: rgba(255, 209, 102, .08);
    border-left: .2em solid var(--warning);
    border-radius: .6rem;
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

#action-links,
.page-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: .7em;
}

.route-picker {
    display: flex;
    align-items: end;
    gap: .5em;
    flex-wrap: wrap;
}

.route-picker label,
.page-actions > label {
    display: inline-flex;
    color: var(--muted);
    font-size: .7em;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
}

.route-picker label {
    flex-direction: column;
}

.page-actions > label {
    align-items: center;
    gap: .45em;
    text-transform: none;
}

.route-picker select {
    font-size: .95em;
}

.route-picker button,
.page-actions button,
.page-actions a,
.swap-link {
    font-size: .7em;
}

.icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding-inline: .7rem;
}

.icon-button svg {
    width: 1.35em;
    height: 1.35em;
    fill: currentColor;
}

.status-message {
    padding: .45rem;
    color: var(--muted);
    background: rgba(10, 34, 51, .72);
    border: 1px solid rgba(125, 231, 232, .16);
    border-radius: .9rem;
    font-size: .7em;
}

.status-message[hidden] {
    display: none;
}

.status-frame {
    display: block;
    width: 100%;
    height: 4.5rem;
    border: 0;
    color-scheme: dark;
    background: transparent;
}

.swap-link {
    margin-left: .5em;
}

details {
    margin-top: .8em;
}

summary {
    cursor: pointer;
    color: var(--muted);
}

img {
    border-radius: .8rem;
}

body > aside {
    margin-top: 1rem;
    color: var(--muted);
    font-size: .78em;
}

body > aside nav ul,
body > aside > ul {
    padding-left: 1.2em;
}

@media (prefers-color-scheme: light) {
    :root {
        color-scheme: light;
        --night: #eef6f6;
        --line: rgba(9, 92, 100, .3);
        --text: #0c2e35;
        --muted: #52727a;
        --signal: #07888f;
        --signal-strong: #065e64;
        --warning: #9a5b00;
    }

    body {
        background:
            radial-gradient(circle at 12% -10%, rgba(7, 136, 143, .16), transparent 34rem),
            radial-gradient(circle at 88% 8%, rgba(255, 209, 102, .3), transparent 26rem),
            linear-gradient(150deg, #f2f9f9 0%, #e2eff2 48%, #d4e6ea 100%);
    }

    body::before {
        opacity: .45;
    }

    main {
        background: linear-gradient(145deg, rgba(255, 255, 255, .94), rgba(240, 248, 249, .92));
        box-shadow: 0 1.5rem 4rem rgba(12, 46, 53, .18), inset 0 1px rgba(255, 255, 255, .8);
    }

    main > section,
    main section section,
    details,
    body > aside {
        background: rgba(255, 255, 255, .55);
        border-color: rgba(9, 92, 100, .18);
    }

    select,
    button {
        background: rgba(7, 136, 143, .08);
    }

    .status-message {
        background: rgba(255, 255, 255, .75);
        border-color: rgba(9, 92, 100, .18);
    }

    .driftsmeldinger {
        color: #7a4a00;
        background: rgba(255, 209, 102, .22);
    }

    li.next {
        text-shadow: none;
    }

    a {
        text-decoration-color: rgba(6, 94, 100, .4);
    }
}
`}
        </style>
      </head>
      <body>
        <section className="status-message" hidden>
          <iframe
            className="status-frame"
            src="/status-messages/index.html"
            title="General status messages"
            sandbox=""
          />
        </section>
        <section className="status-message" hidden>
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
            <button
              id="geo-find-nearest"
              type="button"
              className="icon-button"
              aria-label="Find nearest crossing"
              title="Find nearest crossing"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
              </svg>
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
