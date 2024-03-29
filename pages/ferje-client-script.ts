import { fetchFerriesCached, places } from "../ferryFetcher.ts";

// document.querySelector("#refetch-button")
//   ?.addEventListener("click", () => {
//     window.location.reload();
//   });

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
      if (existingSettings && existingSettings.includes("geolocate")) {
        //TODO: add better handling
        document.querySelector("#geolocate-checkbox")?.setAttribute(
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

  if (allowedSettings && allowedSettings.includes("geolocate")) {
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
    }

    function error(err) {
      console.warn(`ERROR(${err.code}): ${err.message}`);
    }

    navigator.geolocation.getCurrentPosition(success, error, options);
  }
}

maybeGetGeo();
