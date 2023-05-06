import { h } from "https://esm.sh/preact";

import { getNextFerries, places } from "../ferryFetcher.ts";

export type FerjetiderProps = {
  from?: string;
  to?: string;
};

export async function Ferjetider(props: FerjetiderProps) {
  const arr = props.from && props.to
    ? [
      { from: props.from, to: props.to },
    ]
    : [
      {
        from: "vangsnes",
        to: "hella",
      },
      {
        from: "hella",
        to: "vangsnes",
      },
    ];

  const ferryData = await Promise.all(arr.map(async (fromTo) => {
    return {
      ...fromTo,
      data: await getNextFerries(fromTo),
    };
  }));

  return (
    <html>
      <body>
        {ferryData.map((data) => {
          return (
            <section>
              <h2>{places[data.from].name} to {places[data.to].name}</h2>
              <ol>
                {data.data
                  ?.map((timestamp) => (
                    <li>
                      {(new Date(timestamp)).toLocaleTimeString(
                        "no-NO",
                        { timeZone: "Europe/Oslo" },
                      )}
                    </li>
                  ))}
              </ol>
            </section>
          );
        })}
      </body>
    </html>
  );
}
