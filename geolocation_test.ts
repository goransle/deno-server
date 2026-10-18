import { assertEquals } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import { places } from "./ferryFetcher.ts";
import { calculateDistance, findClosestFerryStop } from "./utils/geo.ts";

Deno.test("calculateDistance - Vangsnes to Hella", () => {
  const vangsnes = places["vangsnes"];
  const hella = places["hella"];

  const distance = calculateDistance(
    vangsnes.coordinates.latitude,
    vangsnes.coordinates.longitude,
    hella.coordinates.latitude,
    hella.coordinates.longitude,
  );

  assertEquals(distance > 3 && distance < 7, true);
});

Deno.test("calculateDistance - Fodnes to Mannheller", () => {
  const fodnes = places["fodnes"];
  const mannheller = places["mannheller"];

  const distance = calculateDistance(
    fodnes.coordinates.latitude,
    fodnes.coordinates.longitude,
    mannheller.coordinates.latitude,
    mannheller.coordinates.longitude,
  );

  assertEquals(distance > 2 && distance < 6, true);
});

Deno.test("findClosestFerryStop - location near Vangsnes", () => {
  const closest = findClosestFerryStop(61.175, 6.637);
  assertEquals(closest, "vangsnes");
});

Deno.test("findClosestFerryStop - location near Hella", () => {
  const closest = findClosestFerryStop(61.207, 6.598);
  assertEquals(closest, "hella");
});

Deno.test("findClosestFerryStop - location near Mannheller", () => {
  const closest = findClosestFerryStop(61.160, 7.337);
  assertEquals(closest, "mannheller");
});

Deno.test("findClosestFerryStop - location near Fodnes", () => {
  const closest = findClosestFerryStop(61.149, 7.384);
  assertEquals(closest, "fodnes");
});

Deno.test("findClosestFerryStop - location between Vangsnes and Hella", () => {
  const closest = findClosestFerryStop(61.191, 6.617);
  assertEquals(
    closest === "vangsnes" || closest === "hella",
    true,
  );
});
