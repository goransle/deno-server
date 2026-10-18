import { assertEquals } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import {
  calculateDistance,
  findClosestFerryStop,
  formatCountdown,
  getClosestRoute,
  getMinDistanceToLine,
  hasCoordinates,
  hasCoordinatesObject,
  resolveRoute,
} from "./geo.ts";
import { ferryLines, places } from "../ferryFetcher.ts";

Deno.test("calculateDistance - zero distance for same point", () => {
  const distance = calculateDistance(61.175, 6.637, 61.175, 6.637);
  assertEquals(distance, 0);
});

Deno.test("calculateDistance - known distance Vangsnes to Hella", () => {
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

Deno.test("hasCoordinates - valid coordinates", () => {
  assertEquals(hasCoordinates(61.175, 6.637), true);
  assertEquals(hasCoordinates(0, 0), true);
  assertEquals(hasCoordinates(-90, -180), true);
  assertEquals(hasCoordinates(90, 180), true);
});

Deno.test("hasCoordinates - invalid coordinates", () => {
  assertEquals(hasCoordinates(undefined, undefined), false);
  assertEquals(hasCoordinates(NaN, 6.637), false);
  assertEquals(hasCoordinates(61.175, NaN), false);
  assertEquals(hasCoordinates(Infinity, 0), false);
});

Deno.test("hasCoordinatesObject - valid coordinates", () => {
  assertEquals(hasCoordinatesObject({ userLat: 61.175, userLon: 6.637 }), true);
  assertEquals(hasCoordinatesObject({}), false);
  assertEquals(
    hasCoordinatesObject({ userLat: undefined, userLon: undefined }),
    false,
  );
});

Deno.test("formatCountdown - departing now", () => {
  const now = Date.now();
  const pastTime = new Date(now - 60000).toISOString();
  assertEquals(formatCountdown(pastTime, now), "departing now");
});

Deno.test("formatCountdown - minutes", () => {
  const now = Date.now();
  const futureTime = new Date(now + 30 * 60000).toISOString();
  assertEquals(formatCountdown(futureTime, now), "in 30 min");
});

Deno.test("formatCountdown - hours and minutes", () => {
  const now = Date.now();
  const futureTime = new Date(now + 90 * 60000).toISOString();
  assertEquals(formatCountdown(futureTime, now), "in 1 h 30 min");
});

Deno.test("formatCountdown - exact hours", () => {
  const now = Date.now();
  const futureTime = new Date(now + 120 * 60000).toISOString();
  assertEquals(formatCountdown(futureTime, now), "in 2 h");
});

Deno.test("resolveRoute - no arguments returns fallback", () => {
  const route = resolveRoute();
  assertEquals(route, { from: "vangsnes", to: "hella" });
});

Deno.test("resolveRoute - invalid places returns fallback", () => {
  const route = resolveRoute("invalid", "also-invalid");
  assertEquals(route, { from: "vangsnes", to: "hella" });
});

Deno.test("resolveRoute - valid places returns route", () => {
  const route = resolveRoute("fodnes", "mannheller");
  assertEquals(route, { from: "fodnes", to: "mannheller" });
});

Deno.test("resolveRoute - null values returns fallback", () => {
  const route = resolveRoute(null, null);
  assertEquals(route, { from: "vangsnes", to: "hella" });
});

Deno.test("getMinDistanceToLine - near Vangsnes", () => {
  const distance = getMinDistanceToLine(61.175, 6.637, "vangsnes", "hella");
  assertEquals(distance < 1, true);
});

Deno.test("getMinDistanceToLine - near Fodnes returns Fodnes-Mannheller distance", () => {
  const distance = getMinDistanceToLine(61.149, 7.384, "fodnes", "mannheller");
  assertEquals(distance < 1, true);
});

Deno.test("findClosestFerryStop - near each stop", () => {
  assertEquals(findClosestFerryStop(61.175, 6.637), "vangsnes");
  assertEquals(findClosestFerryStop(61.207, 6.598), "hella");
  assertEquals(findClosestFerryStop(61.160, 7.337), "mannheller");
  assertEquals(findClosestFerryStop(61.149, 7.384), "fodnes");
});

Deno.test("getClosestRoute - near Vangsnes returns Vangsnes-Hella", () => {
  const route = getClosestRoute(61.175, 6.637, ferryLines);
  assertEquals(route.from, "vangsnes");
  assertEquals(route.to, "hella");
});

Deno.test("getClosestRoute - near Mannheller returns Fodnes-Mannheller", () => {
  const route = getClosestRoute(61.160, 7.337, ferryLines);
  const isFodnesMannheller = (route.from === "fodnes" && route.to === "mannheller") ||
    (route.from === "mannheller" && route.to === "fodnes");
  assertEquals(isFodnesMannheller, true);
});
