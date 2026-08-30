import assert from "node:assert/strict";
import { filterThread } from "./filter-thread.ts";
import type { ThreadItem } from "../../shared/thread.ts";

const fixture: ThreadItem[] = [
  { kind: "user", text: "list files" },
  {
    kind: "assistant",
    blocks: [
      { type: "text", text: "I will run ls" },
      { type: "toolCall", id: "c1", name: "bash" },
    ],
  },
  { kind: "user", text: "thanks" },
];

assert.equal(filterThread(fixture, "").length, 3);
assert.deepEqual(filterThread(fixture, "thanks"), [{ kind: "user", text: "thanks" }]);
assert.deepEqual(filterThread(fixture, "bash"), [
  {
    kind: "assistant",
    blocks: [{ type: "toolCall", id: "c1", name: "bash" }],
  },
]);
assert.equal(filterThread(fixture, "nope").length, 0);
console.log("search ok");
