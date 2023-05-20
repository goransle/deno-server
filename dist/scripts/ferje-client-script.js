(() => {
  // pages/ferje-client-script.ts
  document.querySelector("#refetch-button")?.addEventListener("click", () => {
    window.location.reload();
  });
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
        if (existingSettings && existingSettings.includes("geolocate")) {
          document.querySelector("#geolocate-checkbox")?.setAttribute(
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
    if (allowedSettings && allowedSettings.includes("geolocate")) {
      let error = function(err) {
        console.warn(`ERROR(${err.code}): ${err.message}`);
      };
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
      navigator.geolocation.getCurrentPosition(success, error, options);
    }
  }
  maybeGetGeo();
})();
