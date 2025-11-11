import { assertEquals } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import { places } from "./ferryFetcher.ts";

// Haversine distance formula (copied from client script for testing)
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

// Find the closest ferry stop to a given location
function findClosestFerryStop(userLat: number, userLon: number): string | null {
  let closestStop: string | null = null;
  let minDistance = Infinity;

  for (const [key, place] of Object.entries(places)) {
    const distance = calculateDistance(
      userLat, 
      userLon, 
      place.coordinates.latitude, 
      place.coordinates.longitude
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestStop = key;
    }
  }

  return closestStop;
}

Deno.test("calculateDistance - Vangsnes to Hella", () => {
  const vangsnes = places["vangsnes"];
  const hella = places["hella"];
  
  const distance = calculateDistance(
    vangsnes.coordinates.latitude,
    vangsnes.coordinates.longitude,
    hella.coordinates.latitude,
    hella.coordinates.longitude
  );
  
  // These two stops are about 4-6 km apart
  assertEquals(distance > 3 && distance < 7, true);
});

Deno.test("calculateDistance - Fodnes to Mannheller", () => {
  const fodnes = places["fodnes"];
  const mannheller = places["mannheller"];
  
  const distance = calculateDistance(
    fodnes.coordinates.latitude,
    fodnes.coordinates.longitude,
    mannheller.coordinates.latitude,
    mannheller.coordinates.longitude
  );
  
  // These two stops are about 3-5 km apart
  assertEquals(distance > 2 && distance < 6, true);
});

Deno.test("findClosestFerryStop - location near Vangsnes", () => {
  // Coordinates very close to Vangsnes
  const closest = findClosestFerryStop(61.175, 6.637);
  assertEquals(closest, "vangsnes");
});

Deno.test("findClosestFerryStop - location near Hella", () => {
  // Coordinates very close to Hella
  const closest = findClosestFerryStop(61.207, 6.598);
  assertEquals(closest, "hella");
});

Deno.test("findClosestFerryStop - location near Mannheller", () => {
  // Coordinates very close to Mannheller
  const closest = findClosestFerryStop(61.160, 7.337);
  assertEquals(closest, "mannheller");
});

Deno.test("findClosestFerryStop - location near Fodnes", () => {
  // Coordinates very close to Fodnes
  const closest = findClosestFerryStop(61.149, 7.384);
  assertEquals(closest, "fodnes");
});

Deno.test("findClosestFerryStop - location between Vangsnes and Hella", () => {
  // Midpoint between Vangsnes and Hella should be closer to one or the other
  const closest = findClosestFerryStop(61.191, 6.617);
  // Should return either vangsnes or hella
  assertEquals(
    closest === "vangsnes" || closest === "hella",
    true
  );
});
