import { fetchFerriesCached, places } from "../ferryFetcher.ts";

document.querySelector("#refetch-button")
  ?.addEventListener("click", () => {
    window.location.reload();
  });

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

              if (returnValue && returnValue !== 'cancel' &&  original) {
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
