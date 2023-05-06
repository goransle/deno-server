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
    },
    body: JSON.stringify(payload),
  }).then((res) => res.ok ? res.json() : null);

  return data;
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
