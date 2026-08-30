import assert from "node:assert/strict";
import { parseAppSettings } from "./app-settings.ts";

assert.deepEqual(parseAppSettings(null), {});
assert.deepEqual(parseAppSettings({ providerId: "openai-codex" }).providerId, "openai-codex");
assert.deepEqual(
  parseAppSettings({ model: { provider: "openai-codex", id: "gpt-5.4" } }).model,
  { provider: "openai-codex", id: "gpt-5.4" },
);
assert.equal(parseAppSettings({ thinkingLevel: "high" }).thinkingLevel, "high");
assert.equal(parseAppSettings({ thinkingLevel: "nope" }).thinkingLevel, undefined);
console.log("app-settings ok");
