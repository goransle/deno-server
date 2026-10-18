import { assertEquals } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import {
  ferryLines,
  fetchDriftsmeldingerForStops,
  fetchFerriesCached,
  getNextFerries,
  places,
} from "./ferryFetcher.ts";

function mockFetchOnce(responseBody: unknown, status = 200) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((() =>
    Promise.resolve(
      new Response(JSON.stringify(responseBody), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )) as unknown as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

function mockFetchSequence(responses: { body: unknown; status?: number }[]) {
  const originalFetch = globalThis.fetch;
  let callIndex = 0;
  globalThis.fetch = ((() => {
    const item = responses[Math.min(callIndex, responses.length - 1)];
    callIndex++;
    return Promise.resolve(
      new Response(JSON.stringify(item.body), {
        status: item.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as unknown as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

Deno.test("places: contains all expected ferry stops", () => {
  assertEquals(Object.keys(places).sort(), [
    "dragsvik",
    "fodnes",
    "hella",
    "mannheller",
    "vangsnes",
  ]);
});

Deno.test("places: each place has required fields", () => {
  for (const [key, place] of Object.entries(places)) {
    assertEquals(typeof place.place, "string", `place.place missing for ${key}`);
    assertEquals(typeof place.name, "string", `place.name missing for ${key}`);
    assertEquals(
      typeof place.coordinates.latitude,
      "number",
      `latitude missing for ${key}`,
    );
    assertEquals(
      typeof place.coordinates.longitude,
      "number",
      `longitude missing for ${key}`,
    );
    assertEquals(
      place.coordinates.latitude >= -90 && place.coordinates.latitude <= 90,
      true,
      `latitude out of range for ${key}`,
    );
    assertEquals(
      place.coordinates.longitude >= -180 && place.coordinates.longitude <= 180,
      true,
      `longitude out of range for ${key}`,
    );
  }
});

Deno.test("ferryLines: contains expected routes", () => {
  assertEquals(ferryLines.length, 4);
  const routeStrings = ferryLines.map(([from, to]) => `${from}-${to}`);
  assertEquals(routeStrings.includes("vangsnes-hella"), true);
  assertEquals(routeStrings.includes("hella-dragsvik"), true);
  assertEquals(routeStrings.includes("vangsnes-dragsvik"), true);
  assertEquals(routeStrings.includes("fodnes-mannheller"), true);
});

Deno.test("ferryLines: all endpoints exist in places", () => {
  for (const [from, to] of ferryLines) {
    assertEquals(
      places[from] !== undefined,
      true,
      `places["${from}"] is undefined`,
    );
    assertEquals(
      places[to] !== undefined,
      true,
      `places["${to}"] is undefined`,
    );
  }
});

Deno.test("getNextFerries: returns mapped trips with notices and scheduledTime", async () => {
  const restore = mockFetchOnce({
    tripPatterns: [
      {
        startTime: "2026-10-01T10:00:00+02:00",
        legs: [
          {
            aimedStartTime: "2026-10-01T10:00:00+02:00",
            serviceJourney: {
              notices: [{ text: "Extra departure" }],
            },
          },
        ],
      },
      {
        startTime: "2026-10-01T11:00:00+02:00",
        legs: [
          {
            aimedStartTime: "2026-10-01T11:05:00+02:00",
            serviceJourney: {},
          },
        ],
      },
    ],
    nextCursor: null,
  });

  try {
    const trips = await getNextFerries({ from: "vangsnes", to: "hella" });
    assertEquals(Array.isArray(trips), true);
    assertEquals(trips?.length, 2);
    assertEquals(trips?.[0].startTime, "2026-10-01T10:00:00+02:00");
    assertEquals(trips?.[0].scheduledTime, "2026-10-01T10:00:00+02:00");
    assertEquals(trips?.[0].notices.length, 1);
    assertEquals(trips?.[0].notices[0].text, "Extra departure");
    assertEquals(trips?.[1].scheduledTime, "2026-10-01T11:05:00+02:00");
    assertEquals(trips?.[1].notices.length, 0);
  } finally {
    restore();
  }
});

Deno.test("getNextFerries: follows cursor for pagination", async () => {
  const restore = mockFetchSequence([
    {
      body: {
        tripPatterns: [{ startTime: "2026-10-01T10:00:00+02:00", legs: [] }],
        nextCursor: "cursor-abc",
      },
    },
    {
      body: {
        tripPatterns: [{ startTime: "2026-10-01T12:00:00+02:00", legs: [] }],
        nextCursor: null,
      },
    },
  ]);

  try {
    const trips = await getNextFerries({ from: "vangsnes", to: "hella" });
    assertEquals(trips?.length, 2);
    assertEquals(trips?.[0].startTime, "2026-10-01T10:00:00+02:00");
    assertEquals(trips?.[1].startTime, "2026-10-01T12:00:00+02:00");
  } finally {
    restore();
  }
});

Deno.test("getNextFerries: returns undefined when fetch fails", async () => {
  const restore = mockFetchOnce({}, 500);

  try {
    const trips = await getNextFerries({ from: "vangsnes", to: "hella" });
    assertEquals(trips, undefined);
  } finally {
    restore();
  }
});

Deno.test("fetchFerriesCached: returns empty data for invalid places", async () => {
  const data = await fetchFerriesCached({ from: "invalid", to: "alsonot" });
  assertEquals(data.ferries, null);
  assertEquals(data.driftsmeldinger, []);
});

Deno.test("fetchFerriesCached: fetches and caches ferries for valid route", async () => {
  const restore = mockFetchSequence([
    {
      body: {
        tripPatterns: [
          { startTime: "2026-10-01T10:00:00+02:00", legs: [] },
        ],
        nextCursor: null,
      },
    },
    {
      body: {
        Siri: {
          ServiceDelivery: {
            SituationExchangeDelivery: [],
          },
        },
      },
    },
  ]);

  try {
    const data = await fetchFerriesCached({ from: "vangsnes", to: "hella" });
    assertEquals(Array.isArray(data.ferries), true);
    assertEquals(data.ferries?.length, 1);
    assertEquals(data.driftsmeldinger, []);
  } finally {
    restore();
  }
});

Deno.test("fetchDriftsmeldingerForStops: returns empty for no stop ids", async () => {
  const result = await fetchDriftsmeldingerForStops([]);
  assertEquals(result, []);
});

Deno.test("fetchDriftsmeldingerForStops: filters by affected stops", async () => {
  const vangsnesStop = places["vangsnes"].place;
  const hellaStop = places["hella"].place;

  const restore = mockFetchOnce({
    Siri: {
      ServiceDelivery: {
        SituationExchangeDelivery: [
          {
            Situations: {
              PtSituationElement: [
                {
                  SituationNumber: { value: "situation-1" },
                  Summary: [{ value: "Test disruption" }],
                  Affects: {
                    StopPlaces: {
                      AffectedStopPlace: [
                        { StopPlaceRef: { value: vangsnesStop } },
                      ],
                    },
                  },
                },
                {
                  SituationNumber: { value: "situation-2" },
                  Summary: [{ value: "Other disruption" }],
                  Affects: {
                    StopPlaces: {
                      AffectedStopPlace: [
                        { StopPlaceRef: { value: "NSR:StopPlace:99999" } },
                      ],
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  try {
    const result = await fetchDriftsmeldingerForStops([vangsnesStop]);
    assertEquals(result.length, 1);
    assertEquals(result[0].id, "situation-1");
    assertEquals(result[0].summary, "Test disruption");

    const resultOther = await fetchDriftsmeldingerForStops([hellaStop]);
    assertEquals(resultOther.length, 0);
  } finally {
    restore();
  }
});
