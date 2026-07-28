const AUTO_LOCATE_STORAGE_KEY = "ferjetider:auto-locate-disabled";
const LEGACY_SETTINGS_STORAGE_KEY = "allowedSettings";
const REDIRECT_STORAGE_KEY = "ferjetider:redirected-to-nearest";

type Coordinates = {
  latitude: number;
  longitude: number;
};

function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors.
  }
}

function readSessionStorage(key: string): string | null {
  try {
    return globalThis.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string) {
  try {
    globalThis.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage errors.
  }
}

function isAutoLocateDisabled() {
  const explicit = readStorage(AUTO_LOCATE_STORAGE_KEY);
  if (explicit !== null) {
    return explicit === "true";
  }

  const legacy = readStorage(LEGACY_SETTINGS_STORAGE_KEY);
  return legacy ? legacy.includes("no-geolocate") : false;
}

function setAutoLocateDisabled(disabled: boolean) {
  writeStorage(AUTO_LOCATE_STORAGE_KEY, String(disabled));
  if (disabled) {
    writeStorage(LEGACY_SETTINGS_STORAGE_KEY, "no-geolocate");
    return;
  }

  writeStorage(LEGACY_SETTINGS_STORAGE_KEY, "");
}

function buildNearestRouteUrl(coords: Coordinates) {
  const url = new URL("/ferjetider/nearest", globalThis.location.origin);
  url.searchParams.set("lat", String(coords.latitude));
  url.searchParams.set("lon", String(coords.longitude));
  return `${url.pathname}${url.search}`;
}

function redirectToNearestRoute(coords: Coordinates, markRedirected: boolean) {
  if (markRedirected) {
    writeSessionStorage(REDIRECT_STORAGE_KEY, "true");
  }

  globalThis.location.assign(buildNearestRouteUrl(coords));
}

function requestUserCoordinates(
  onSuccess: (coords: Coordinates) => void,
) {
  if (!navigator.geolocation) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    () => {
      // Ignore geolocation errors.
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    },
  );
}

function maybeAutoRedirectToNearest() {
  const path = globalThis.location.pathname;
  const isDefaultRoute = path === "/" || path === "/ferjetider";
  if (!isDefaultRoute) {
    return;
  }

  if (isAutoLocateDisabled()) {
    return;
  }

  if (readSessionStorage(REDIRECT_STORAGE_KEY) === "true") {
    return;
  }

  requestUserCoordinates((coords) => redirectToNearestRoute(coords, true));
}

function setupNearestRouteButton() {
  const button = document.getElementById("geo-find-nearest");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  button.addEventListener("click", () => {
    requestUserCoordinates((coords) => redirectToNearestRoute(coords, false));
  });
}

function setupAutoLocateToggle() {
  const toggle = document.getElementById("geo-auto-toggle");
  if (!(toggle instanceof HTMLInputElement)) {
    return;
  }

  toggle.checked = !isAutoLocateDisabled();
  toggle.addEventListener("change", () => {
    setAutoLocateDisabled(!toggle.checked);
  });
}

setupNearestRouteButton();
setupAutoLocateToggle();
maybeAutoRedirectToNearest();
