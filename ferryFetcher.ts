export type Place = {
  "place": string;
  "name": string;
  "coordinates": {
    "latitude": number;
    "longitude": number;
  };
};

export type FerryLine = [string, string];

export type getNextFerriesObject = {
  from: string;
  to: string;
};

export type TransitResponse = {
  tripPatterns: {
    startTime: string;
    legs?: {
      serviceJourney?: {
        notices?: { text?: string }[];
      };
    }[];
  }[];
  nextCursor: string;
};

export type Driftsmelding = {
  id: string;
  summary: string;
  description?: string;
  severity?: string;
  startTime?: string;
  endTime?: string;
  infoLinks: { uri: string; label?: string }[];
  affectedStops: string[];
  affectedLines: string[];
};

const SX_DATASET_ID = "SOF";
const SX_ENDPOINT =
  `https://api.entur.io/realtime/v1/rest/sx?datasetId=${SX_DATASET_ID}`;
const SX_CACHE_TTL = 60_000;

type SxCacheEntry = {
  timestamp: number;
  entries: Driftsmelding[];
};

let sxCache: SxCacheEntry | null = null;

type SxValueWrapper = {
  value?: string;
};

type SxTranslation = {
  value?: string;
  lang?: string;
} | string;

type SxValidityPeriod = {
  StartTime?: string;
  EndTime?: string;
};

type SxInfoLink = {
  Uri?: string;
  Label?: SxTranslation[];
};

type SxAffectedStopPoint = {
  StopPointRef?: SxValueWrapper;
  StopPlaceRef?: SxValueWrapper;
};

type SxAffectedStopPlace = {
  StopPlaceRef?: SxValueWrapper;
};

type SxAffectedLine = {
  LineRef?: SxValueWrapper;
};

type SxAffectedVehicleJourney = {
  LineRef?: SxValueWrapper;
  FramedVehicleJourneyRef?: {
    LineRef?: SxValueWrapper;
  };
};

type SxAffects = {
  StopPoints?: {
    AffectedStopPoint?: SxAffectedStopPoint[];
  };
  StopPlaces?: {
    AffectedStopPlace?: SxAffectedStopPlace[];
  };
  Networks?: {
    AffectedNetwork?: Array<{
      AffectedLine?: SxAffectedLine[];
    }>;
  };
  VehicleJourneys?: {
    AffectedVehicleJourney?: SxAffectedVehicleJourney[];
  };
};

type SxSituation = {
  SituationNumber?: SxValueWrapper;
  Summary?: SxTranslation[];
  Description?: SxTranslation[];
  Severity?: string;
  ValidityPeriod?: SxValidityPeriod[];
  InfoLinks?: {
    InfoLink?: SxInfoLink[];
  };
  Affects?: SxAffects;
};

type SxSituationExchangeDelivery = {
  Situations?: {
    PtSituationElement?: SxSituation[];
  };
};

type SxResponse = {
  Siri?: {
    ServiceDelivery?: {
      SituationExchangeDelivery?: SxSituationExchangeDelivery[];
    };
  };
};

export const places: Record<string, Place> = {
  "vangsnes": {
    "place": "NSR:StopPlace:58339",
    "name": "Vangsnes ferjekai",
    "coordinates": {
      "latitude": 61.174909,
      "longitude": 6.637196,
    },
  },
  "hella": {
    "place": "NSR:StopPlace:58324",
    "name": "Hella ferjekai",
    "coordinates": {
      "latitude": 61.207413,
      "longitude": 6.597993,
    },
  },
  "dragsvik": {
    "coordinates": {
      "latitude": 61.215077,
      "longitude": 6.5649,
    },
    "name": "Dragsvik ferjekai",
    "place": "NSR:StopPlace:58344",
  },
  "fodnes": {
    "coordinates": {
      "latitude": 61.1487,
      "longitude": 7.383853,
    },
    "name": "Fodnes ferjekai",
    "place": "NSR:StopPlace:58179",
  },
  "mannheller": {
    "coordinates": {
      "latitude": 61.160443,
      "longitude": 7.336834,
    },
    "name": "Mannheller ferjekai",
    "place": "NSR:StopPlace:58180",
  },
};

export const ferryLines: FerryLine[] = [
  ["vangsnes", "hella"],
  ["hella", "dragsvik"],
  ["vangsnes", "dragsvik"],
  ["fodnes", "mannheller"],
];

const today = new Date();

const ferryRequestJSON = (from: string, to: string) => {
  return {
    "from": places[from],
    "to": places[to],
    "searchDate": today.toISOString(), //(new Date()).setDate(today.getDate() + 1),
    "tripMode": "oneway",
    "arriveBy": false,
    "searchPreset": "RECOMMENDED",
    "walkSpeed": 1.4,
    "minimumTransferTime": 120,
    "searchFilter": [
      "car_ferry",
    ],
    "debugItineraryFilter": false,
  };
};

async function fetchTransit(
  payload: Record<string, unknown>,
): Promise<TransitResponse | null> {
  const data = await fetch("https://api.entur.io/client/search/v1/transit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ET-Client-Name": "goransle-ferjetider",
    },
    body: JSON.stringify(payload),
  }).then((res) => res.ok ? res.json() : null);

  return data;
}

export type CachedResponse = {
  ferries: string;
  timestamp: string;
};
const cachedResponse: Record<string, CachedResponse> = {};

export type FerryData = {
  ferries: {
    startTime: string;
    notices: { text?: string }[];
  }[] | null;
  driftsmeldinger: Driftsmelding[];
};

export async function fetchFerriesCached(
  params: { from: string; to: string },
): Promise<FerryData> {
  const response: FerryData = {
    ferries: null,
    driftsmeldinger: [],
  };

  const validPlaces = Object.keys(places);

  const { from, to } = params;

  if (validPlaces.includes(to) && validPlaces.includes(from)) {
    const cacheKey = `${from}-${to}`;

    const cached = cachedResponse[cacheKey];
    if (cached) {
      if (cached.ferries && cached.timestamp) {
        // TODO: add env variable for this
        const cachedAt = new Date(cached.timestamp).getTime();
        const isStale = Number.isNaN(cachedAt) ||
          (Date.now() - cachedAt) > (2 * 60 * 1000);

        if (!isStale) {
          console.log(
            `using cached response for ${cacheKey} from ${cached.timestamp}`,
          );
          response.ferries = JSON.parse(cached.ferries);
        }
      }
    }

    if (!response.ferries) {
      const ferries = await getNextFerries({
        from,
        to,
      });

      if (ferries) {
        response.ferries = ferries;
        if (!cachedResponse[cacheKey]) {
          cachedResponse[cacheKey] = {
            ferries: "",
            timestamp: "",
          };
        }
        cachedResponse[cacheKey].ferries = JSON.stringify(response.ferries);
        cachedResponse[cacheKey].timestamp = (new Date()).toISOString();
        console.log(`Updated cache for ${cacheKey}`);
      }
    }

    const stopIds = [
      places[from].place,
      places[to].place,
    ];
    response.driftsmeldinger = await fetchDriftsmeldingerForStops(stopIds);
  }

  return response;
}

export async function getNextFerries(config: getNextFerriesObject) {
  const data = await fetchTransit(ferryRequestJSON(config.from, config.to));

  if (data) {
    let trips = data.tripPatterns;
    const cursor = data.nextCursor;

    if (cursor) {
      const moreData = await fetchTransit({ cursor });
      if (moreData) {
        trips = [...trips, ...moreData.tripPatterns];
      }
    }

    return trips.map((tp) => {
      const notices = (tp.legs ?? [])
        .flatMap((leg) => leg?.serviceJourney?.notices ?? [])
        .filter((notice): notice is { text?: string } => Boolean(notice));

      return {
        startTime: tp.startTime,
        notices,
      };
    });
  }
}

function firstTranslationValue(entries?: SxTranslation[]): string | undefined {
  if (!entries) {
    return undefined;
  }

  for (const entry of entries) {
    if (!entry) continue;
    if (typeof entry === "string") {
      return entry;
    }
    if (entry.value && entry.value.trim().length > 0) {
      return entry.value.trim();
    }
  }

  return undefined;
}

function collectStopRefs(affects?: SxAffects): string[] {
  if (!affects) {
    return [];
  }

  const stops = new Set<string>();
  const add = (value?: string) => {
    if (value && value.trim().length > 0) {
      stops.add(value.trim());
    }
  };

  for (const stop of affects.StopPoints?.AffectedStopPoint ?? []) {
    add(stop?.StopPointRef?.value);
    add(stop?.StopPlaceRef?.value);
  }

  for (const stop of affects.StopPlaces?.AffectedStopPlace ?? []) {
    add(stop?.StopPlaceRef?.value);
  }

  return Array.from(stops);
}

function collectLineRefs(affects?: SxAffects): string[] {
  if (!affects) {
    return [];
  }

  const lines = new Set<string>();
  const add = (value?: string) => {
    if (value && value.trim().length > 0) {
      lines.add(value.trim());
    }
  };

  for (const network of affects.Networks?.AffectedNetwork ?? []) {
    for (const line of network?.AffectedLine ?? []) {
      add(line?.LineRef?.value);
    }
  }

  for (const vehicleJourney of affects.VehicleJourneys?.AffectedVehicleJourney ??
    []) {
    add(vehicleJourney?.LineRef?.value);
    add(vehicleJourney?.FramedVehicleJourneyRef?.LineRef?.value);
  }

  return Array.from(lines);
}

async function fetchSxSituations(): Promise<Driftsmelding[]> {
  const now = Date.now();
  if (sxCache && (now - sxCache.timestamp) < SX_CACHE_TTL) {
    return sxCache.entries;
  }

  try {
    const response = await fetch(SX_ENDPOINT, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "ET-Client-Name": "goransle-ferjetider",
      },
    });

    if (!response.ok) {
      console.error("Failed fetching driftsmeldinger", response.status);
      return sxCache?.entries ?? [];
    }

    const entries: Driftsmelding[] = [];

    const payload = await response.json() as SxResponse;
    const deliveries =
      payload?.Siri?.ServiceDelivery?.SituationExchangeDelivery ?? [];

    for (const delivery of deliveries) {
      const situationElements =
        delivery?.Situations?.PtSituationElement ?? [];
      for (const situation of situationElements) {
        const id = situation?.SituationNumber?.value ??
          crypto.randomUUID();
        const summary = firstTranslationValue(situation?.Summary) ?? "";
        const description = firstTranslationValue(situation?.Description);
        const severity = situation?.Severity ?? undefined;

        const validity = situation?.ValidityPeriod?.[0];
        const startTime = validity?.StartTime ?? undefined;
        const endTime = validity?.EndTime ?? undefined;

        const infoLinks = (situation?.InfoLinks?.InfoLink ?? [])
          .map((link) => {
            const uri = link?.Uri?.trim();
            if (!uri) return null;

            const label = firstTranslationValue(link?.Label);
            return label
              ? { uri, label }
              : { uri };
          })
          .filter((link): link is { uri: string; label?: string } =>
            link !== null
          );

        const affectedStops = collectStopRefs(situation?.Affects);
        const affectedLines = collectLineRefs(situation?.Affects);

        entries.push({
          id,
          summary,
          description,
          severity,
          startTime,
          endTime,
          infoLinks,
          affectedStops,
          affectedLines,
        });
      }
    }

    entries.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    sxCache = {
      timestamp: now,
      entries,
    };

    return entries;
  } catch (error) {
    console.error("Error fetching driftsmeldinger", error);
    return sxCache?.entries ?? [];
  }
}

export async function fetchDriftsmeldingerForStops(
  stopIds: string[],
): Promise<Driftsmelding[]> {
  const uniqueStopIds = Array.from(new Set(stopIds.filter(Boolean)));
  if (uniqueStopIds.length === 0) {
    return [];
  }

  const situations = await fetchSxSituations();

  return situations.filter((situation) =>
    situation.affectedStops.some((stop) => uniqueStopIds.includes(stop))
  );
}

export async function getFerryDistance(ferje: string, currentLatLon: string) {
  const authKey = Deno.env.get("OPEN_ROUTE_KEY");
  const ferryData = places[ferje];

  if (ferryData && authKey) {
    const payload = {
      coordinates: [
        currentLatLon.split(",").map((val) => parseFloat(val)),
        [ferryData.coordinates.longitude, ferryData.coordinates.latitude],
      ],
    };

    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authKey,
        },
        body: JSON.stringify(payload),
      },
    ).then((res) => res.ok ? res.json() : null);

    return response;
  }

  return null;
}
