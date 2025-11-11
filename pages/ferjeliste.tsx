import { h } from "https://esm.sh/preact@10.25.3";
import { ferryLines } from "../ferryFetcher.ts";

export function Ferjeliste() {
  return (
    <ul>
      {ferryLines.map(
        ([from, to]) => {
          const line = `${from}-${to}`;
          return (
            <li key={line}>
              <a href={"/ferjetider/" + line}>
                {from.charAt(0).toUpperCase() + from.slice(1)} - {to.charAt(0).toUpperCase() + to.slice(1)}
              </a>
            </li>
          );
        },
      )}
    </ul>
  );
}
