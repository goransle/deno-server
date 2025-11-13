import { assertEquals } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import { ferryLines, places } from "./ferryFetcher.ts";

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

Deno.test("getMinDistanceToLine - location near Vangsnes", () => {
  // Location very close to Vangsnes
  const userLat = 61.175;
  const userLon = 6.637;
  
  // For the Vangsnes-Hella line, should return very small distance (< 1km)
  const distance = getMinDistanceToLine(userLat, userLon, "vangsnes", "hella");
  assertEquals(distance < 1, true);
});

Deno.test("getMinDistanceToLine - location between stops", () => {
  // Location roughly halfway between Vangsnes and Hella
  const userLat = 61.191;
  const userLon = 6.617;
  
  const distance = getMinDistanceToLine(userLat, userLon, "vangsnes", "hella");
  
  // Should be less than the full distance between the stops
  const fullDistance = calculateDistance(
    places["vangsnes"].coordinates.latitude,
    places["vangsnes"].coordinates.longitude,
    places["hella"].coordinates.latitude,
    places["hella"].coordinates.longitude
  );
  
  assertEquals(distance < fullDistance, true);
});

Deno.test("ferry line sorting - location near Vangsnes", () => {
  const userLat = 61.175;
  const userLon = 6.637;
  
  // Calculate distances for all ferry lines
  const linesWithDistance = ferryLines.map(([from, to]) => ({
    from,
    to,
    distance: getMinDistanceToLine(userLat, userLon, from, to)
  }));
  
  // Sort by distance
  const sorted = linesWithDistance.sort((a, b) => a.distance - b.distance);
  
  // First item should include Vangsnes (closest stop)
  const firstLine = sorted[0];
  const includesVangsnes = firstLine.from === "vangsnes" || firstLine.to === "vangsnes";
  assertEquals(includesVangsnes, true);
});

Deno.test("ferry line sorting - location near Fodnes", () => {
  const userLat = 61.149;
  const userLon = 7.384;
  
  // Calculate distances for all ferry lines
  const linesWithDistance = ferryLines.map(([from, to]) => ({
    from,
    to,
    distance: getMinDistanceToLine(userLat, userLon, from, to)
  }));
  
  // Sort by distance
  const sorted = linesWithDistance.sort((a, b) => a.distance - b.distance);
  
  // First item should be Fodnes-Mannheller line (closest)
  const firstLine = sorted[0];
  assertEquals(
    (firstLine.from === "fodnes" && firstLine.to === "mannheller") ||
    (firstLine.from === "mannheller" && firstLine.to === "fodnes"),
    true
  );
});

Deno.test("ferry line sorting - sorted order is consistent", () => {
  const userLat = 61.175;
  const userLon = 6.637;
  
  // Calculate distances for all ferry lines
  const linesWithDistance = ferryLines.map(([from, to]) => ({
    from,
    to,
    distance: getMinDistanceToLine(userLat, userLon, from, to)
  }));
  
  // Sort by distance
  const sorted = linesWithDistance.sort((a, b) => a.distance - b.distance);
  
  // Verify that distances are in ascending order
  for (let i = 0; i < sorted.length - 1; i++) {
    assertEquals(sorted[i].distance <= sorted[i + 1].distance, true);
  }
});
