import { h } from "https://esm.sh/preact@10.25.3";
import { render } from "https://esm.sh/preact-render-to-string@6.5.12";
import { assertStringIncludes } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import { LatestActivity } from "./pages/latest-activity.tsx";

Deno.test("LatestActivity: renders activity with formatted stats and link", () => {
  const html = render(
    <LatestActivity
      activity={{
        id: "123456",
        name: "Morning ride",
        type: "Ride",
        startTime: "2026-10-01T07:30:00.000",
        distance: 42000,
        movingTime: 5400,
        elapsedTime: 5700,
        totalElevationGain: 350,
      }}
    />,
  );
  assertStringIncludes(html, "Morning ride");
  assertStringIncludes(html, "42.0 km");
  assertStringIncludes(html, "1h 30m");
  assertStringIncludes(html, "intervals.icu/activities/123456");
});

Deno.test("LatestActivity: renders error message", () => {
  const html = render(
    <LatestActivity error="Missing INTERVALS_ICU_API_KEY environment variable" />,
  );
  assertStringIncludes(html, "Missing INTERVALS_ICU_API_KEY");
});

Deno.test("LatestActivity: renders empty state", () => {
  const html = render(<LatestActivity error="No activities found." />);
  assertStringIncludes(html, "No activities found.");
});

Deno.test("LatestActivity: renders activity with missing optional fields", () => {
  const html = render(
    <LatestActivity
      activity={{
        name: "Quick walk",
      }}
    />,
  );
  assertStringIncludes(html, "Quick walk");
  assertStringIncludes(html, "Unnamed activity") === false;
});

Deno.test("LatestActivity: renders unnamed activity fallback", () => {
  const html = render(
    <LatestActivity
      activity={{
        id: "789",
      }}
    />,
  );
  assertStringIncludes(html, "Unnamed activity");
  assertStringIncludes(html, "intervals.icu/activities/789");
});
