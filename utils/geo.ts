import { places } from "../ferryFetcher.ts";

export type UserCoordinates = {
  userLat?: number;
  userLon?: number;
};

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function hasCoordinates(
  userLat?: number,
  userLon?: number,
): boolean {
  return Number.isFinite(userLat) && Number.isFinite(userLon);
}

export function hasCoordinatesObject(coords: UserCoordinates): boolean {
  return Number.isFinite(coords.userLat) && Number.isFinite(coords.userLon);
}

export function formatCountdown(startTime: string, now = Date.now()): string {
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

export function resolveRoute(
  from?: string | null,
  to?: string | null,
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

export function getMinDistanceToLine(
  userLat: number,
  userLon: number,
  from: string,
  to: string,
): number {
  const fromPlace = places[from];
  const toPlace = places[to];

  const distanceToFrom = calculateDistance(
    userLat,
    userLon,
    fromPlace.coordinates.latitude,
    fromPlace.coordinates.longitude,
  );

  const distanceToTo = calculateDistance(
    userLat,
    userLon,
    toPlace.coordinates.latitude,
    toPlace.coordinates.longitude,
  );

  return Math.min(distanceToFrom, distanceToTo);
}

export function findClosestFerryStop(
  userLat: number,
  userLon: number,
): string | null {
  let closestStop: string | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const [key, place] of Object.entries(places)) {
    const distance = calculateDistance(
      userLat,
      userLon,
      place.coordinates.latitude,
      place.coordinates.longitude,
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestStop = key;
    }
  }

  return closestStop;
}

export function getClosestRoute(
  userLat: number,
  userLon: number,
  ferryLines: [string, string][],
): { from: string; to: string } {
  const closestStop = findClosestFerryStop(userLat, userLon);

  if (!closestStop) {
    return resolveRoute();
  }

  for (const [from, to] of ferryLines) {
    if (from === closestStop) {
      return { from, to };
    }
    if (to === closestStop) {
      return { from: to, to: from };
    }
  }

  return resolveRoute();
}
