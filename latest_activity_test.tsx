import { h } from "https://esm.sh/preact@10.25.3";
import { render } from "https://esm.sh/preact-render-to-string@6.5.12";
import { LatestActivity } from "./pages/latest-activity.tsx";

// Render with an activity
const withActivity = render(
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
if (!withActivity.includes("Morning ride")) throw new Error("missing name");
if (!withActivity.includes("42.0 km")) throw new Error("missing distance");
if (!withActivity.includes("1h 30m")) throw new Error("missing moving time");
if (!withActivity.includes("intervals.icu/activities/123456")) {
  throw new Error("missing link");
}
console.log("✓ renders activity with formatted stats and link");

// Render with error
const withError = render(
  <LatestActivity error="Missing INTERVALS_ICU_API_KEY environment variable" />,
);
if (!withError.includes("Missing INTERVALS_ICU_API_KEY")) {
  throw new Error("missing error message");
}
console.log("✓ renders error message");

// Render empty state
const empty = render(<LatestActivity error="No activities found." />);
if (!empty.includes("No activities found.")) throw new Error("missing empty state");
console.log("✓ renders empty state");

console.log("\nAll LatestActivity page tests passed");
