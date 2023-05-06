import { h } from "https://cdn.skypack.dev/preact";

export type TestProps = {
    text: string;
};

export function Test(props: TestProps) {
  return (
    <div>
      <h1>{props.text}</h1>
    </div>
  );
}
