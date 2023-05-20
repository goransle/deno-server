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
  var options = {
    enableHighAccuracy: true,
    timeout: 5e3,
    maximumAge: 0
  };
  function success(pos) {
    const crd = pos.coords;
    console.log("Your current position is:");
    console.log(`Latitude : ${crd.latitude}`);
    console.log(`Longitude: ${crd.longitude}`);
    console.log(`More or less ${crd.accuracy} meters.`);
  }
  function error(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
  }
  navigator.geolocation.getCurrentPosition(success, error, options);
})();
