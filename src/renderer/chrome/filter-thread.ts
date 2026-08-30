import type { ThreadBlock, ThreadItem } from "../../shared/thread";

export function filterThread(
  items: readonly ThreadItem[],
  query: string,
): ThreadItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...items];
  const visible: ThreadItem[] = [];
  for (const item of items) {
    if (item.kind !== "assistant") {
      if (item.text.toLowerCase().includes(needle)) visible.push(item);
      continue;
    }
    const blocks = item.blocks.filter((block) => blockText(block).includes(needle));
    if (blocks.length > 0) visible.push({ kind: "assistant", blocks });
  }
  return visible;
}

function blockText(block: ThreadBlock): string {
  switch (block.type) {
    case "text":
      return block.text.toLowerCase();
    case "thinking":
      return block.thinking.toLowerCase();
    case "toolCall":
      return block.name.toLowerCase();
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}
