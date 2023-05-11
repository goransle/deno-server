import { fetchFerriesCached, places } from "../ferryFetcher.ts";

document.querySelector("#refetch-button")
  ?.addEventListener("click", (e) => {
    window.location.reload();
  });
