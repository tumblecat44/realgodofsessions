import assert from "node:assert/strict";
import { foldThread } from "./thread.ts";

let thread = foldThread([], { type: "user", text: "hi" });
thread = foldThread(thread, { type: "agent_start" });
thread = foldThread(thread, {
  type: "message_update",
  message: { role: "assistant", content: [{ type: "text", text: "yo" }] },
  assistantMessageEvent: { type: "text_delta", delta: "yo" },
});
assert.deepEqual(thread, [
  { kind: "user", text: "hi" },
  { kind: "assistant", blocks: [{ type: "text", text: "yo" }] },
]);

thread = foldThread(thread, {
  type: "tool_execution_start",
  toolCallId: "c1",
  toolName: "bash",
});
thread = foldThread(thread, {
  type: "tool_execution_end",
  toolCallId: "c1",
  toolName: "bash",
  isError: false,
});
const tools = thread
  .flatMap((item) => (item.kind === "assistant" ? item.blocks : []))
  .filter((block) => block.type === "toolCall");
assert.equal(tools.length, 1);
assert.equal(tools[0]?.type === "toolCall" && tools[0].id, "c1");
assert.equal(tools[0]?.type === "toolCall" && tools[0].ok, true);

thread = foldThread(thread, { type: "agent_settled" });
assert.equal(thread.filter((item) => item.kind === "assistant").length, 1);

thread = foldThread(thread, { type: "user", text: "again" });
thread = foldThread(thread, {
  type: "message_update",
  message: { role: "assistant", content: [{ type: "text", text: "ok" }] },
});
assert.equal(thread.filter((item) => item.kind === "user").length, 2);
assert.equal(thread.at(-1)?.kind, "assistant");

const withThinking = foldThread([{ kind: "user", text: "q" }], {
  type: "message_update",
  message: {
    role: "assistant",
    content: [
      { type: "thinking", thinking: "hmm" },
      { type: "text", text: "ans" },
    ],
  },
});
assert.deepEqual(withThinking[1], {
  kind: "assistant",
  blocks: [
    { type: "thinking", thinking: "hmm" },
    { type: "text", text: "ans" },
  ],
});
assert.ok(
  withThinking[1]?.kind === "assistant" &&
    !withThinking[1].blocks.some((block) => (block as { type: string }).type === "task"),
);

assert.deepEqual(foldThread([], { type: "agent_start" }), []);
assert.deepEqual(
  foldThread([], {
    type: "message_start",
    message: { role: "user", content: "nope" },
  }),
  [],
);

console.log("thread ok");
