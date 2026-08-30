import assert from "node:assert/strict";
import { splitFences } from "./fences.ts";

assert.deepEqual(splitFences("hello"), [{ type: "prose", text: "hello" }]);
assert.deepEqual(splitFences("hi\n```js\n<script>alert(1)</script>\n```\nbye"), [
  { type: "prose", text: "hi\n" },
  { type: "code", lang: "js", text: "<script>alert(1)</script>\n" },
  { type: "prose", text: "bye" },
]);
assert.deepEqual(splitFences("```ts\nconst x = 1;"), [
  { type: "code", lang: "ts", text: "const x = 1;" },
]);
assert.ok(!splitFences("plain").some((part) => part.type === "task"));
console.log("fences ok");
