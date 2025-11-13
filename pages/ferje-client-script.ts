import { fetchFerriesCached, places } from "../ferryFetcher.ts";

// document.querySelector("#refetch-button")
//   ?.addEventListener("click", () => {
//     window.location.reload();
//   });

// Fetch ferry configuration from server
let ferryLinesFromServer: [string, string][] | null = null;

async function getFerryLines(): Promise<[string, string][]> {
  if (ferryLinesFromServer) {
    return ferryLinesFromServer;
  }
  
  try {
    const response = await fetch('/api/ferry-config');
    if (response.ok) {
      const data = await response.json();
      ferryLinesFromServer = data.ferryLines;
      return ferryLinesFromServer;
    }
  } catch (error) {
    console.warn('Failed to fetch ferry config from server:', error);
  }
  
  // Fallback to hardcoded ferry lines if API fails
  ferryLinesFromServer = [
    ["vangsnes", "hella"],
    ["hella", "dragsvik"],
    ["vangsnes", "dragsvik"],
    ["fodnes", "mannheller"],
  ];
  return ferryLinesFromServer;
}

// Haversine distance formula to calculate distance between two coordinates (fallback)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Get actual road distance from user location to a ferry stop
async function getRoadDistance(ferryStop: string, userLon: number, userLat: number): Promise<number | null> {
  try {
    const response = await fetch(`/ferje-directions/${ferryStop}/${userLon},${userLat}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.routes && data.routes[0]) {
      // Distance is in meters, convert to kilometers
      return parseFloat(data.routes[0].summary.distance) / 1000;
    }
  } catch (error) {
    console.warn(`Failed to get road distance for ${ferryStop}:`, error);
  }
  return null;
}

// Find the closest ferry stop to a given location using road distance
async function findClosestFerryStop(userLat: number, userLon: number): Promise<string | null> {
  let closestStop: string | null = null;
  let minDistance = Infinity;

  // Try to get road distances for all ferry stops
  const distancePromises = Object.keys(places).map(async (key) => {
    const roadDistance = await getRoadDistance(key, userLon, userLat);
    return { key, distance: roadDistance };
  });

  const distances = await Promise.all(distancePromises);

  // Log all road distances for debugging
  console.log("Road distances to ferry stops:");
  distances.forEach(({ key, distance }) => {
    console.log(`  ${key}: ${distance !== null ? distance.toFixed(2) + ' km' : 'N/A'}`);
  });

  // Find the stop with minimum road distance
  for (const { key, distance } of distances) {
    if (distance !== null && distance < minDistance) {
      minDistance = distance;
      closestStop = key;
    }
  }

  // If no road distances were available, fall back to Haversine distance
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

// Get the closest ferry route based on user location using road distance
async function getClosestFerryRoute(userLat: number, userLon: number): Promise<{ from: string, to: string } | null> {
  // Get ferry lines from server
  const ferryLines = await getFerryLines();

  // Find the closest stop by road
  const closestStop = await findClosestFerryStop(userLat, userLon);
  
  if (!closestStop) return null;

  console.log(`Looking for ferry routes containing: ${closestStop}`);

  // Find a ferry line that includes the closest stop
  for (const [from, to] of ferryLines) {
    if (from === closestStop) {
      console.log(`Found route: ${from} → ${to}`);
      return { from, to };
    }
    if (to === closestStop) {
      console.log(`Found route (reversed): ${to} → ${from}`);
      return { from: to, to: from }; // Return with closest as "from"
    }
  }

  return null;
}

const dialog = document.getElementById<HTMLDialogElement>("placeDialog");

document.querySelectorAll<HTMLSpanElement>(".ferry-from, .ferry-to")?.forEach(
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
              e.preventDefault(); // We don't want to submit this fake form
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
                        returnValue,
                      ),
                    ),
                  );
                  return;
                }

                window.location.replace(
                  new URL(
                    `${currentURL}/${returnValue}-${original}`,
                  ),
                );
              }
            });
          }
        }
      },
    );
  },
);

const settingsDialog = document.querySelector<HTMLDialogElement>(
  "#settingsDialog",
);

if (settingsDialog) {
  document.querySelector<HTMLButtonElement>(
    "#settings-toggle",
  )?.addEventListener("click", () => {
    if (settingsDialog) {
      settingsDialog.showModal();
      const existingSettings = window.localStorage.getItem("allowedSettings");
      if (existingSettings && existingSettings.includes("no-geolocate")) {
        document.querySelector("#no-geolocate-checkbox")?.setAttribute(
          "checked",
          "true",
        );
      }
    }
  });
  document.querySelector<HTMLButtonElement>("#settingsSave")?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();

      const allowedSettings = [];

      const form = settingsDialog.querySelector<HTMLFormElement>(
        "form",
      );

      if (form) {
        const formData = new FormData(form);
        for (const data of formData.values()) {
          allowedSettings.push(data);
        }

        console.log(allowedSettings);

        window.localStorage.setItem(
          "allowedSettings",
          allowedSettings.join("-"),
        );
        settingsDialog.close(allowedSettings.join("+"));
        return;
      }

      settingsDialog.close();
    },
  );

  settingsDialog.addEventListener("close", () => {
    maybeGetGeo();
  });
}

function maybeGetGeo() {
  const allowedSettings = window.localStorage.getItem("allowedSettings");

  // Use opt-out: show distance info unless user has explicitly disabled geolocation
  if (allowedSettings && allowedSettings.includes("no-geolocate")) {
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
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
            `/ferje-directions/${fromPlace.dataset.original}/${crd.longitude},${crd.latitude}`,
          ).then((res) => res.ok ? res.json() : null);

          if (data && infoP) {
            const [route] = data.routes;
            if (route) {
              console.log(route.summary);

              infoP.innerHTML = `${
                (parseFloat(route.summary.distance) / 1000).toFixed(1)
              }km / ${(parseFloat(route.summary.duration) / 3600).toFixed(2)}h`;
            }
          }
        }
      }
      
      // Update ferry list with user coordinates
      updateFerryListWithLocation(crd.latitude, crd.longitude);
    }

    function error(err) {
      console.warn(`ERROR(${err.code}): ${err.message}`);
    }

    navigator.geolocation.getCurrentPosition(success, error, options);
}

// Update the ferry list with user location to show distances
function updateFerryListWithLocation(lat: number, lon: number) {
  const ferjelisteContainer = document.querySelector("#ferjeliste-container");
  if (ferjelisteContainer) {
    // Update the htmx endpoint to include coordinates
    ferjelisteContainer.setAttribute("hx-get", `/ferjeliste?lat=${lat}&lon=${lon}`);
    // Trigger htmx to reload with new parameters
    // @ts-ignore - htmx is loaded globally
    if (typeof htmx !== "undefined") {
      // @ts-ignore
      htmx.trigger(ferjelisteContainer, "load");
    }
  }
}

maybeGetGeo();

// Auto-redirect to closest ferry route on initial page load
function redirectToClosestFerry() {
  const allowedSettings = window.localStorage.getItem("allowedSettings");
  
  // Use opt-out: redirect unless user has explicitly disabled geolocation
  if (allowedSettings && allowedSettings.includes("no-geolocate")) {
    console.log("Geolocation disabled by user");
    return;
  }

  // Check if we're on a default route (no specific ferry route selected)
  const currentPath = window.location.pathname;
  const isDefaultRoute = currentPath === "/" || currentPath === "/ferjetider";
  
  if (!isDefaultRoute) {
    // Already on a specific route, don't redirect
    return;
  }

  // Check if we've already redirected in this session
  const hasRedirected = sessionStorage.getItem("hasRedirectedToClosestFerry");
  if (hasRedirected === "true") {
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  };

  async function success(pos: GeolocationPosition) {
    const crd = pos.coords;
    console.log("Finding closest ferry based on location:", crd.latitude, crd.longitude);
    
    const closestRoute = await getClosestFerryRoute(crd.latitude, crd.longitude);
    
    if (closestRoute) {
      console.log(`Redirecting to closest ferry route: ${closestRoute.from} to ${closestRoute.to}`);
      sessionStorage.setItem("hasRedirectedToClosestFerry", "true");
      window.location.href = `/ferjetider/${closestRoute.from}-${closestRoute.to}`;
    }
  }

  function error(err: GeolocationPositionError) {
    console.warn(`Could not get location for auto-redirect: ${err.code}: ${err.message}`);
  }

  navigator.geolocation.getCurrentPosition(success, error, options);
}

// Run the auto-redirect function
redirectToClosestFerry();
