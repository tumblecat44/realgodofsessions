import type { ChatEvent, WireMessage } from "./protocol";

export type ThreadBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "toolCall"; id: string; name: string; ok?: boolean };

export type ThreadItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; blocks: ThreadBlock[] }
  | { kind: "error"; text: string }
  | { kind: "status"; text: string };

export function foldThread(
  items: readonly ThreadItem[],
  event: ChatEvent,
): ThreadItem[] {
  switch (event.type) {
    case "user":
      return [...items, { kind: "user", text: event.text }];
    case "error":
      return [...items, { kind: "error", text: event.text }];
    case "auth_notice":
      return [...items, { kind: "status", text: event.text }];
    case "auth_prompt":
    case "agent_start":
    case "agent_settled":
    case "agent_end":
      return [...items];
    case "message_start":
    case "message_end":
    case "message_update": {
      const blocks = blocksFromMessage(event.message);
      if (blocks && blocks.length > 0) return upsertAssistant(items, blocks);
      if (event.type !== "message_update") return [...items];
      const inner = event.assistantMessageEvent;
      if (inner?.type === "text_delta" && inner.delta) {
        return appendBlock(items, { type: "text", text: inner.delta }, "text");
      }
      if (inner?.type === "thinking_delta" && inner.delta) {
        return appendBlock(items, { type: "thinking", thinking: inner.delta }, "thinking");
      }
      return [...items];
    }
    case "tool_execution_start":
      return patchTool(items, event.toolCallId, event.toolName);
    case "tool_execution_end":
      return patchTool(items, event.toolCallId, event.toolName, !event.isError);
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

function blocksFromMessage(message: WireMessage): ThreadBlock[] | undefined {
  if (message.role !== "assistant" || !Array.isArray(message.content)) return undefined;
  const blocks: ThreadBlock[] = [];
  for (const part of message.content) {
    if (!isRecord(part) || typeof part.type !== "string") continue;
    if (part.type === "text" && typeof part.text === "string") {
      blocks.push({ type: "text", text: part.text });
      continue;
    }
    if (part.type === "thinking" && typeof part.thinking === "string" && part.thinking) {
      blocks.push({ type: "thinking", thinking: part.thinking });
      continue;
    }
    if (part.type === "toolCall") {
      const id = typeof part.id === "string" ? part.id : "";
      const name = typeof part.name === "string" ? part.name : "";
      if (id || name) blocks.push({ type: "toolCall", id, name });
    }
  }
  return blocks;
}

function upsertAssistant(
  items: readonly ThreadItem[],
  blocks: ThreadBlock[],
): ThreadItem[] {
  const last = items.at(-1);
  if (last?.kind !== "assistant") return [...items, { kind: "assistant", blocks }];
  return [...items.slice(0, -1), { kind: "assistant", blocks: keepToolOk(last.blocks, blocks) }];
}

function keepToolOk(prev: readonly ThreadBlock[], next: readonly ThreadBlock[]): ThreadBlock[] {
  const okById = new Map<string, boolean>();
  for (const block of prev) {
    if (block.type === "toolCall" && block.ok !== undefined) okById.set(block.id, block.ok);
  }
  return next.map((block) => {
    if (block.type !== "toolCall") return block;
    const ok = okById.get(block.id);
    return ok === undefined ? block : { ...block, ok };
  });
}

function appendBlock(
  items: readonly ThreadItem[],
  incoming: ThreadBlock,
  mergeType: "text" | "thinking",
): ThreadItem[] {
  const last = items.at(-1);
  if (last?.kind !== "assistant") return [...items, { kind: "assistant", blocks: [incoming] }];
  const blocks = last.blocks.slice();
  const tail = blocks.at(-1);
  if (mergeType === "text" && tail?.type === "text" && incoming.type === "text") {
    blocks[blocks.length - 1] = { type: "text", text: tail.text + incoming.text };
  } else if (
    mergeType === "thinking" &&
    tail?.type === "thinking" &&
    incoming.type === "thinking"
  ) {
    blocks[blocks.length - 1] = { type: "thinking", thinking: tail.thinking + incoming.thinking };
  } else {
    blocks.push(incoming);
  }
  return [...items.slice(0, -1), { kind: "assistant", blocks }];
}

function patchTool(
  items: readonly ThreadItem[],
  id: string,
  name: string,
  ok?: boolean,
): ThreadItem[] {
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    if (item.kind !== "assistant") continue;
    const at = item.blocks.findIndex((block) => block.type === "toolCall" && block.id === id);
    if (at < 0) continue;
    const current = item.blocks[at];
    if (current.type !== "toolCall") continue;
    const blocks = item.blocks.slice();
    blocks[at] = { type: "toolCall", id, name: name || current.name, ok: ok ?? current.ok };
    return items.map((row, rowIndex) =>
      rowIndex === index ? { kind: "assistant", blocks } : row,
    );
  }
  const block: ThreadBlock = { type: "toolCall", id, name, ok };
  const last = items.at(-1);
  if (last?.kind === "assistant") {
    return [...items.slice(0, -1), { kind: "assistant", blocks: [...last.blocks, block] }];
  }
  return [...items, { kind: "assistant", blocks: [block] }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
