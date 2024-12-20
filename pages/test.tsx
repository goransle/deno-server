import { h } from "https://esm.sh/preact@10.25.3";

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
