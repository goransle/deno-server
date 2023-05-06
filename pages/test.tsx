import { h } from "https://esm.sh/preact";

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
