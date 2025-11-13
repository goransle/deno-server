import { h } from "https://esm.sh/preact@10.25.3";
import { ferryLines, places } from "../ferryFetcher.ts";

export type FerjelisteProps = {
  userLat?: number;
  userLon?: number;
};

// Haversine distance formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Calculate minimum distance from user to either endpoint of a ferry line
function getMinDistanceToLine(userLat: number, userLon: number, from: string, to: string): number {
  const fromPlace = places[from];
  const toPlace = places[to];
  
  const distanceToFrom = calculateDistance(
    userLat,
    userLon,
    fromPlace.coordinates.latitude,
    fromPlace.coordinates.longitude
  );
  
  const distanceToTo = calculateDistance(
    userLat,
    userLon,
    toPlace.coordinates.latitude,
    toPlace.coordinates.longitude
  );
  
  return Math.min(distanceToFrom, distanceToTo);
}

export function Ferjeliste(props: FerjelisteProps) {
  // Generate both directions for each ferry line
  let linesToDisplay = ferryLines.flatMap(([from, to]) => [
    {
      from,
      to,
      line: `${from}-${to}`,
      distance: props.userLat && props.userLon 
        ? getMinDistanceToLine(props.userLat, props.userLon, from, to)
        : null
    },
    {
      from: to,
      to: from,
      line: `${to}-${from}`,
      distance: props.userLat && props.userLon 
        ? getMinDistanceToLine(props.userLat, props.userLon, to, from)
        : null
    }
  ]);

  // Sort by distance if coordinates are available
  if (props.userLat && props.userLon) {
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
            <a href={"/ferjetider/" + line}>
              {from.charAt(0).toUpperCase() + from.slice(1)} - {to.charAt(0).toUpperCase() + to.slice(1)}
            </a>
            {distance !== null && (
              <span style={{ fontSize: "0.7em", marginLeft: "0.5em", opacity: 0.8 }}>
                ({distance.toFixed(1)} km)
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
