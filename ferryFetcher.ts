const places = {
    'vangsnes': {
        "place": "NSR:StopPlace:58339", "name": "Vangsnes ferjekai", "coordinates": {
            "latitude": 61.174909, "longitude": 6.637196
        }
    },
    'hella': {
        "place": "NSR:StopPlace:58324", "name": "Hella ferjekai", "coordinates": {
            "latitude": 61.207413, "longitude": 6.597993
        }
    }
}

const today = new Date();


const ferryRequestJSON = {
    "from": places['vangsnes'],
    "to": places['hella'],
    "searchDate": today.toISOString(), //(new Date()).setDate(today.getDate() + 1),
    "tripMode": "oneway",
    "arriveBy": false,
    "searchPreset": "RECOMMENDED",
    "walkSpeed": 1.4,
    "minimumTransferTime": 120,
    "searchFilter": [
        "car_ferry"
    ],
    "debugItineraryFilter": false
};

export async function getNextFerries() {
    const data = await fetch('https://api.entur.io/client/search/v1/transit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(ferryRequestJSON)

    }).then(res => res.ok ? res.json() : null);
    if (data) {
        return data.tripPatterns.map(tp => tp.startTime)
    }
}




