import assert from "node:assert/strict";
import { toWireEvent } from "./agent-events.ts";

assert.equal(toWireEvent({ type: "turn_start" }), undefined);
assert.deepEqual(
  toWireEvent({
    type: "message_update",
    message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
    assistantMessageEvent: { type: "text_delta", delta: "hi" },
  } as { type: string }),
  {
    type: "message_update",
    message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
    assistantMessageEvent: { type: "text_delta", delta: "hi" },
  },
);
assert.deepEqual(
  toWireEvent({ type: "tool_execution_start", toolCallId: "c1", toolName: "bash" }),
  { type: "tool_execution_start", toolCallId: "c1", toolName: "bash" },
);
assert.deepEqual(
  toWireEvent({
    type: "tool_execution_end",
    toolCallId: "c1",
    toolName: "bash",
    isError: true,
  }),
  { type: "tool_execution_end", toolCallId: "c1", toolName: "bash", isError: true },
);
assert.deepEqual(toWireEvent({ type: "agent_end" }), { type: "agent_end" });
assert.deepEqual(toWireEvent({ type: "agent_settled" }), { type: "agent_settled" });
console.log("agent-events ok");
