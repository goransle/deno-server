import { h } from "https://esm.sh/preact@10.25.3";
import { ferryLines, places } from "../ferryFetcher.ts";
import { getMinDistanceToLine, hasCoordinates } from "../utils/geo.ts";

export type FerjelisteProps = {
  userLat?: number;
  userLon?: number;
};

function getRouteHref(line: string, userLat?: number, userLon?: number) {
  const url = new URL(`/ferjetider/${line}`, "https://ferjetider.local");

  if (hasCoordinates(userLat, userLon)) {
    url.searchParams.set("lat", String(userLat));
    url.searchParams.set("lon", String(userLon));
  }

  return `${url.pathname}${url.search}`;
}

export function Ferjeliste(props: FerjelisteProps) {
  const userLat = props.userLat;
  const userLon = props.userLon;
  const hasUserCoordinates = hasCoordinates(userLat, userLon);

  let linesToDisplay = ferryLines.flatMap(([from, to]) => [
    {
      from,
      to,
      line: `${from}-${to}`,
      distance:
        hasUserCoordinates && userLat !== undefined && userLon !== undefined
          ? getMinDistanceToLine(userLat, userLon, from, to)
          : null,
    },
    {
      from: to,
      to: from,
      line: `${to}-${from}`,
      distance:
        hasUserCoordinates && userLat !== undefined && userLon !== undefined
          ? getMinDistanceToLine(userLat, userLon, to, from)
          : null,
    },
  ]);

  if (hasUserCoordinates) {
    linesToDisplay = linesToDisplay.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }

  return (
    <ul>
      {linesToDisplay.map(({ from, to, line, distance }) => {
        return (
          <li key={line}>
            <a href={getRouteHref(line, userLat, userLon)}>
              {from.charAt(0).toUpperCase() + from.slice(1)} -{" "}
              {to.charAt(0).toUpperCase() + to.slice(1)}
            </a>
            {distance !== null && (
              <span
                style={{ fontSize: "0.7em", marginLeft: "0.5em", opacity: 0.8 }}
              >
                ({distance.toFixed(1)} km)
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
