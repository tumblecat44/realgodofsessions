export type FencePart =
  | { type: "prose"; text: string }
  | { type: "code"; lang: string; text: string };

export function splitFences(text: string): FencePart[] {
  const parts: FencePart[] = [];
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("```", index);
    if (open < 0) {
      parts.push({ type: "prose", text: text.slice(index) });
      break;
    }
    if (open > index) parts.push({ type: "prose", text: text.slice(index, open) });
    const after = open + 3;
    const newline = text.indexOf("\n", after);
    const headerEnd = newline < 0 ? text.length : newline + 1;
    const lang = text.slice(after, newline < 0 ? text.length : newline).trim();
    const close = text.indexOf("```", headerEnd);
    if (close < 0) {
      parts.push({ type: "code", lang, text: text.slice(headerEnd) });
      break;
    }
    parts.push({ type: "code", lang, text: text.slice(headerEnd, close) });
    index = close + 3;
    if (text[index] === "\n") index += 1;
  }
  return parts.filter((part) => part.text.length > 0 || part.type === "code");
}
