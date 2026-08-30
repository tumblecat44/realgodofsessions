import { Text } from "./Text";

export function StreamingText({ text }: { text: string }) {
  return <Text text={text} caret />;
}
