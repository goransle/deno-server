import { h } from "https://esm.sh/preact";

const ferryLines = [
  "vangsnes-hella",
  "hella-dragsvik",
  "vangsnes-dragsvik",
  "fodnes-mannheller",
];

export function Ferjeliste() {
  return (
    <ul>
      {ferryLines.map(
        (line) => (
          <li>
            <a href={"/ferjetider/" + line}>
              {line.split("-")
                .map((place) =>
                  place
                    .charAt(0)
                    .toUpperCase() + place.slice(1)
                ).join(" - ")}
            </a>
          </li>
        ),
      )}
    </ul>
  );
}
