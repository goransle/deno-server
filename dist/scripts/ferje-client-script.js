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
      let success = function(pos) {
        const crd = pos.coords;
        console.log("Your current position is:");
        console.log(`Latitude : ${crd.latitude}`);
        console.log(`Longitude: ${crd.longitude}`);
        console.log(`More or less ${crd.accuracy} meters.`);
      }, error = function(err) {
        console.warn(`ERROR(${err.code}): ${err.message}`);
      };
      const options = {
        enableHighAccuracy: true,
        timeout: 5e3,
        maximumAge: 0
      };
      navigator.geolocation.getCurrentPosition(success, error, options);
    }
  }
  maybeGetGeo();
})();
