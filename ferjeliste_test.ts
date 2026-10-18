import { assertEquals } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import { ferryLines } from "./ferryFetcher.ts";
import { calculateDistance, getMinDistanceToLine } from "./utils/geo.ts";

Deno.test("getMinDistanceToLine - location near Vangsnes", () => {
  const userLat = 61.175;
  const userLon = 6.637;

  const distance = getMinDistanceToLine(userLat, userLon, "vangsnes", "hella");
  assertEquals(distance < 1, true);
});

Deno.test("getMinDistanceToLine - location between stops", () => {
  const userLat = 61.191;
  const userLon = 6.617;

  const distance = getMinDistanceToLine(userLat, userLon, "vangsnes", "hella");

  const fullDistance = calculateDistance(
    61.174909,
    6.637196,
    61.207413,
    6.597993,
  );

  assertEquals(distance < fullDistance, true);
});

Deno.test("ferry line sorting - location near Vangsnes", () => {
  const userLat = 61.175;
  const userLon = 6.637;

  const linesWithDistance = ferryLines.map(([from, to]) => ({
    from,
    to,
    distance: getMinDistanceToLine(userLat, userLon, from, to),
  }));

  const sorted = linesWithDistance.sort((a, b) => a.distance - b.distance);

  const firstLine = sorted[0];
  const includesVangsnes = firstLine.from === "vangsnes" ||
    firstLine.to === "vangsnes";
  assertEquals(includesVangsnes, true);
});

Deno.test("ferry line sorting - location near Fodnes", () => {
  const userLat = 61.149;
  const userLon = 7.384;

  const linesWithDistance = ferryLines.map(([from, to]) => ({
    from,
    to,
    distance: getMinDistanceToLine(userLat, userLon, from, to),
  }));

  const sorted = linesWithDistance.sort((a, b) => a.distance - b.distance);

  const firstLine = sorted[0];
  assertEquals(
    (firstLine.from === "fodnes" && firstLine.to === "mannheller") ||
      (firstLine.from === "mannheller" && firstLine.to === "fodnes"),
    true,
  );
});

Deno.test("ferry line sorting - sorted order is consistent", () => {
  const userLat = 61.175;
  const userLon = 6.637;

  const linesWithDistance = ferryLines.map(([from, to]) => ({
    from,
    to,
    distance: getMinDistanceToLine(userLat, userLon, from, to),
  }));

  const sorted = linesWithDistance.sort((a, b) => a.distance - b.distance);

  for (let i = 0; i < sorted.length - 1; i++) {
    assertEquals(sorted[i].distance <= sorted[i + 1].distance, true);
  }
});

Deno.test("ferry lines include both directions", () => {
  const allDirections = ferryLines.flatMap(([from, to]) => [
    `${from}-${to}`,
    `${to}-${from}`,
  ]);

  assertEquals(allDirections.length, ferryLines.length * 2);

  assertEquals(allDirections.includes("vangsnes-hella"), true);
  assertEquals(allDirections.includes("hella-vangsnes"), true);
});
