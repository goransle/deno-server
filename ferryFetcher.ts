export type Place = {
  "place": string;
  "name": string;
  "coordinates": {
    "latitude": number;
    "longitude": number;
  };
};

export type getNextFerriesObject = {
  from: string;
  to: string;
};

export type TransitResponse = {
  tripPatterns: {
    startTime: string;
  }[];
  nextCursor: string;
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
  ferries: string[] | null;
};

export async function fetchFerriesCached(
  params: { from: string; to: string },
): Promise<FerryData> {
  const response: FerryData = {
    ferries: null,
  };

  const validPlaces = Object.keys(places);

  const { from, to } = params;

  if (validPlaces.includes(to) && validPlaces.includes(from)) {
    const cacheKey = `${from}-${to}`;

    const cached = cachedResponse[cacheKey];
    if (cached) {
      if (cached.ferries && cached.timestamp) {
        // TODO: add env variable for this
        const isStale =
          new Date() - new Date(cached.timestamp) > (2 * 60 * 1000);

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

    return trips.map((tp) => tp.startTime);
  }
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
