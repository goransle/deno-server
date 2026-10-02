import { h } from "https://esm.sh/preact@10.25.3";

export type LatestActivityProps = {
  activity?: {
    id: string;
    name?: string;
    type?: string;
    startTime?: string;
    distance?: number;
    movingTime?: number;
    elapsedTime?: number;
    totalElevationGain?: number;
  };
  error?: string;
};

function formatDistance(meters?: number) {
  if (meters === undefined) {
    return null;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds?: number) {
  if (seconds === undefined) {
    return null;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatStartTime(startTime?: string) {
  if (!startTime) {
    return null;
  }
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString("no-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  });
}

export function LatestActivity({ activity, error }: LatestActivityProps) {
  const hasActivity = activity !== undefined;

  return (
    <main style="max-width: 480px; margin: 2rem auto; padding: 1.5rem; font-family: system-ui, sans-serif; background: #1a1a1a; color: #e8e8e8; border-radius: 12px;">
      <h1 style="margin: 0 0 0.25rem; font-size: 1.25rem;">Latest activity</h1>
      <p style="margin: 0 0 1.25rem; color: #888; font-size: 0.9rem;">
        Siste aktivitet fra intervals.icu
      </p>

      {hasActivity
        ? (
          <section>
            <h2 style="margin: 0 0 0.25rem; font-size: 1.1rem;">
              {activity.name || "Unnamed activity"}
            </h2>
            <p style="margin: 0 0 1rem; color: #9a9a9a; font-size: 0.9rem;">
              {formatStartTime(activity.startTime)}
            </p>
            <dl style="margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 1rem; font-size: 0.95rem;">
              {activity.type
                ? [<dt key="type-dt" style="color: #888;">Type</dt>, <dd key="type-dd" style="margin: 0;">{activity.type}</dd>]
                : null}
              {formatDistance(activity.distance) !== null
                ? [<dt key="distance-dt" style="color: #888;">Distance</dt>, <dd key="distance-dd" style="margin: 0;">{formatDistance(activity.distance)}</dd>]
                : null}
              {formatDuration(activity.movingTime) !== null
                ? [<dt key="moving-dt" style="color: #888;">Moving time</dt>, <dd key="moving-dd" style="margin: 0;">{formatDuration(activity.movingTime)}</dd>]
                : null}
              {formatDuration(activity.elapsedTime) !== null
                ? [<dt key="elapsed-dt" style="color: #888;">Elapsed</dt>, <dd key="elapsed-dd" style="margin: 0;">{formatDuration(activity.elapsedTime)}</dd>]
                : null}
              {activity.totalElevationGain !== undefined
                ? [<dt key="elev-dt" style="color: #888;">Elevation</dt>, <dd key="elev-dd" style="margin: 0;">{Math.round(activity.totalElevationGain)} m</dd>]
                : null}
            </dl>
            <p style="margin: 1.25rem 0 0; font-size: 0.85rem;">
              <a
                href={`https://intervals.icu/activities/${activity.id}`}
                style="color: #6db1f2;"
              >
                View on intervals.icu
              </a>
            </p>
          </section>
        )
        : (
          <p style="margin: 0; color: #b0705c; font-size: 0.95rem;">
            {error || "No activities found."}
          </p>
        )}
    </main>
  );
}
