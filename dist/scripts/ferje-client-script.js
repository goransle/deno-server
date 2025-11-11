(() => {
  // ferryFetcher.ts
  var SX_DATASET_ID = "SOF";
  var SX_ENDPOINT = `https://api.entur.io/realtime/v1/rest/sx?datasetId=${SX_DATASET_ID}`;
  var places = {
    "vangsnes": {
      "place": "NSR:StopPlace:58339",
      "name": "Vangsnes ferjekai",
      "coordinates": {
        "latitude": 61.174909,
        "longitude": 6.637196
      }
    },
    "hella": {
      "place": "NSR:StopPlace:58324",
      "name": "Hella ferjekai",
      "coordinates": {
        "latitude": 61.207413,
        "longitude": 6.597993
      }
    },
    "dragsvik": {
      "coordinates": {
        "latitude": 61.215077,
        "longitude": 6.5649
      },
      "name": "Dragsvik ferjekai",
      "place": "NSR:StopPlace:58344"
    },
    "fodnes": {
      "coordinates": {
        "latitude": 61.1487,
        "longitude": 7.383853
      },
      "name": "Fodnes ferjekai",
      "place": "NSR:StopPlace:58179"
    },
    "mannheller": {
      "coordinates": {
        "latitude": 61.160443,
        "longitude": 7.336834
      },
      "name": "Mannheller ferjekai",
      "place": "NSR:StopPlace:58180"
    }
  };

  // pages/ferje-client-script.ts
  var ferryLinesFromServer = null;
  async function getFerryLines() {
    if (ferryLinesFromServer) {
      return ferryLinesFromServer;
    }
    try {
      const response = await fetch("/api/ferry-config");
      if (response.ok) {
        const data = await response.json();
        ferryLinesFromServer = data.ferryLines;
        return ferryLinesFromServer;
      }
    } catch (error) {
      console.warn("Failed to fetch ferry config from server:", error);
    }
    ferryLinesFromServer = [
      ["vangsnes", "hella"],
      ["hella", "dragsvik"],
      ["vangsnes", "dragsvik"],
      ["fodnes", "mannheller"]
    ];
    return ferryLinesFromServer;
  }
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  async function getRoadDistance(ferryStop, userLon, userLat) {
    try {
      const response = await fetch(`/ferje-directions/${ferryStop}/${userLon},${userLat}`);
      if (!response.ok)
        return null;
      const data = await response.json();
      if (data && data.routes && data.routes[0]) {
        return parseFloat(data.routes[0].summary.distance) / 1e3;
      }
    } catch (error) {
      console.warn(`Failed to get road distance for ${ferryStop}:`, error);
    }
    return null;
  }
  async function findClosestFerryStop(userLat, userLon) {
    let closestStop = null;
    let minDistance = Infinity;
    const distancePromises = Object.keys(places).map(async (key) => {
      const roadDistance = await getRoadDistance(key, userLon, userLat);
      return { key, distance: roadDistance };
    });
    const distances = await Promise.all(distancePromises);
    console.log("Road distances to ferry stops:");
    distances.forEach(({ key, distance }) => {
      console.log(`  ${key}: ${distance !== null ? distance.toFixed(2) + " km" : "N/A"}`);
    });
    for (const { key, distance } of distances) {
      if (distance !== null && distance < minDistance) {
        minDistance = distance;
        closestStop = key;
      }
    }
    if (closestStop === null) {
      console.log("Falling back to Haversine distance calculation");
      for (const [key, place] of Object.entries(places)) {
        const distance = calculateDistance(
          userLat,
          userLon,
          place.coordinates.latitude,
          place.coordinates.longitude
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestStop = key;
        }
      }
    }
    console.log(`Closest ferry stop by road: ${closestStop} (${minDistance.toFixed(2)} km)`);
    return closestStop;
  }
  async function getClosestFerryRoute(userLat, userLon) {
    const ferryLines = await getFerryLines();
    const closestStop = await findClosestFerryStop(userLat, userLon);
    if (!closestStop)
      return null;
    console.log(`Looking for ferry routes containing: ${closestStop}`);
    for (const [from, to] of ferryLines) {
      if (from === closestStop) {
        console.log(`Found route: ${from} \u2192 ${to}`);
        return { from, to };
      }
      if (to === closestStop) {
        console.log(`Found route (reversed): ${to} \u2192 ${from}`);
        return { from: to, to: from };
      }
    }
    return null;
  }
  var dialog = document.getElementById("placeDialog");
  document.querySelectorAll(".ferry-from, .ferry-to")?.forEach(
    (element) => {
      element.addEventListener(
        "click",
        () => {
          if (dialog) {
            dialog.showModal();
            const confirmBtn = dialog.querySelector("#confirmBtn");
            const select = dialog.querySelector("select");
            if (confirmBtn && select) {
              select.addEventListener("change", (e) => {
                confirmBtn.value = select.value;
              });
              confirmBtn.addEventListener("click", (e) => {
                e.preventDefault();
                dialog.close(select.value);
              });
              dialog.addEventListener("close", () => {
                const { returnValue } = dialog;
                const { original } = element.dataset;
                if (returnValue && returnValue !== "cancel" && original) {
                  const currentURL = window.location.href;
                  if (currentURL.includes(original)) {
                    window.location.replace(
                      new URL(
                        currentURL.replace(
                          original,
                          returnValue
                        )
                      )
                    );
                    return;
                  }
                  window.location.replace(
                    new URL(
                      `${currentURL}/${returnValue}-${original}`
                    )
                  );
                }
              });
            }
          }
        }
      );
    }
  );
  var settingsDialog = document.querySelector(
    "#settingsDialog"
  );
  if (settingsDialog) {
    document.querySelector(
      "#settings-toggle"
    )?.addEventListener("click", () => {
      if (settingsDialog) {
        settingsDialog.showModal();
        const existingSettings = window.localStorage.getItem("allowedSettings");
        if (existingSettings && existingSettings.includes("no-geolocate")) {
          document.querySelector("#no-geolocate-checkbox")?.setAttribute(
            "checked",
            "true"
          );
        }
      }
    });
    document.querySelector("#settingsSave")?.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        const allowedSettings = [];
        const form = settingsDialog.querySelector(
          "form"
        );
        if (form) {
          const formData = new FormData(form);
          for (const data of formData.values()) {
            allowedSettings.push(data);
          }
          console.log(allowedSettings);
          window.localStorage.setItem(
            "allowedSettings",
            allowedSettings.join("-")
          );
          settingsDialog.close(allowedSettings.join("+"));
          return;
        }
        settingsDialog.close();
      }
    );
    settingsDialog.addEventListener("close", () => {
      maybeGetGeo();
    });
  }
  function maybeGetGeo() {
    const allowedSettings = window.localStorage.getItem("allowedSettings");
    if (allowedSettings && allowedSettings.includes("no-geolocate")) {
      return;
    }
    const options = {
      enableHighAccuracy: true,
      timeout: 5e3,
      maximumAge: 0
    };
    async function success(pos) {
      const crd = pos.coords;
      console.log("Your current position is:");
      console.log(`Latitude : ${crd.latitude}`);
      console.log(`Longitude: ${crd.longitude}`);
      console.log(`More or less ${crd.accuracy} meters.`);
      const firstSection = document.querySelector("section");
      if (firstSection) {
        const fromPlace = firstSection.querySelector(".ferry-from");
        const infoP = firstSection.querySelector(".info");
        if (fromPlace) {
          const data = await fetch(
            `/ferje-directions/${fromPlace.dataset.original}/${crd.longitude},${crd.latitude}`
          ).then((res) => res.ok ? res.json() : null);
          if (data && infoP) {
            const [route] = data.routes;
            if (route) {
              console.log(route.summary);
              infoP.innerHTML = `${(parseFloat(route.summary.distance) / 1e3).toFixed(1)}km / ${(parseFloat(route.summary.duration) / 3600).toFixed(2)}h`;
            }
          }
        }
      }
    }
    function error(err) {
      console.warn(`ERROR(${err.code}): ${err.message}`);
    }
    navigator.geolocation.getCurrentPosition(success, error, options);
  }
  maybeGetGeo();
  function redirectToClosestFerry() {
    const allowedSettings = window.localStorage.getItem("allowedSettings");
    if (allowedSettings && allowedSettings.includes("no-geolocate")) {
      console.log("Geolocation disabled by user");
      return;
    }
    const currentPath = window.location.pathname;
    const isDefaultRoute = currentPath === "/" || currentPath === "/ferjetider";
    if (!isDefaultRoute) {
      return;
    }
    const hasRedirected = sessionStorage.getItem("hasRedirectedToClosestFerry");
    if (hasRedirected === "true") {
      return;
    }
    const options = {
      enableHighAccuracy: true,
      timeout: 5e3,
      maximumAge: 0
    };
    async function success(pos) {
      const crd = pos.coords;
      console.log("Finding closest ferry based on location:", crd.latitude, crd.longitude);
      const closestRoute = await getClosestFerryRoute(crd.latitude, crd.longitude);
      if (closestRoute) {
        console.log(`Redirecting to closest ferry route: ${closestRoute.from} to ${closestRoute.to}`);
        sessionStorage.setItem("hasRedirectedToClosestFerry", "true");
        window.location.href = `/ferjetider/${closestRoute.from}-${closestRoute.to}`;
      }
    }
    function error(err) {
      console.warn(`Could not get location for auto-redirect: ${err.code}: ${err.message}`);
    }
    navigator.geolocation.getCurrentPosition(success, error, options);
  }
  redirectToClosestFerry();
})();
