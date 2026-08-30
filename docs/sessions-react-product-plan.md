# Sessions React product plan

The renderer moves from vanilla DOM to React and Tailwind. The person using Sessions gets a chat workspace that can grow one block at a time. Main and preload stay the IPC boundary.

Product scope is fixed. Execution is local and sequential.

## How we work

Do the four PRs in order on this machine. PR-shell, then PR-thread, then PR-chrome, then PR-stream.

A PR is done when `npm run typecheck` and `npm run check` pass, `npm run dev` still chats, and that PR's **You see** list is true. One check file per PR is enough. Walk the window yourself. Do not invent cloud lanes, Graphite, swarm, or a perf gate.

Commit and open a GitHub PR only when asked.

Do not grow `ChatEvent` for thinking, tools, or tasks. Forward official Pi events. Do not add TaskRow, approval cards, recommendation cards, or tables. Those have no Pi feed.

## Replace the renderer with React (PR-shell)

**Depends on.** None. Already in this working tree. Remaining work is a live look at the window.

**Files.**

- Edit `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `src/renderer/index.html`, `src/main/index.ts`.
- Create `src/renderer/main.tsx`, `App.tsx`, `index.css`, `log.ts`, `log.check.ts`.
- Delete `src/renderer/main.ts` and `src/renderer/styles.css`.

**Build.**

Install React, React DOM, and Tailwind through the Vite plugin. Mount `App` from `main.tsx`. Keep `window.host` as the only IPC client. Copy the current auth, model, effort, log, and composer behavior. Delete the vanilla DOM entry. Keep colors in `index.css` tokens, same values as the old root variables.

`SESSIONS_CDP` can stay. It is a one-line attach hook. Do not build a lane farm around it.

**You see.**

`npm run dev` opens Sessions. Provider, Sign in, composer, Send, and Stop match the old window. A prompt still streams into the log through `window.host`. `src/renderer/main.ts` is gone.

**Check.**

`src/renderer/log.check.ts` applies a `user` event plus a `delta` event and asserts two rows.

## Fold official session events (PR-thread)

**Depends on.** PR-shell.

**Files.**

- Create `src/shared/thread.ts` and `src/shared/thread.check.ts`.
- Create `src/renderer/blocks/Text.tsx`, `Thinking.tsx`, `ToolChip.tsx`.
- Edit `src/shared/protocol.ts`, `src/main/agent-events.ts`, `src/main/agent-host.ts`, `src/preload/index.ts`, `src/renderer/App.tsx`, `package.json`.
- Delete `src/renderer/log.ts` and `src/renderer/log.check.ts`.

**Build.**

Stop growing `ChatEvent` for stream UX. Forward cloneable session fields (`type`, `message.content`, tool ids) plus the host-authored `user`, `error`, and auth events. Fold them into a thread of official content blocks (`text`, `thinking`, `toolCall`). Render each kind from `blocks/` even if the pixels still match PR-shell. `App.tsx` only assembles. Do not add `features/`, `hooks/`, `lib/`, or `components/ui/`.

**You see.**

Two prompts produce two user rows and their assistant text in order. A tool start and tool end share one `toolCallId`. `npm run check` prints `thread ok`. Reload clears the in-memory thread. An empty composer adds no row.

**Check.**

`src/shared/thread.check.ts` folds `agent_start`, `text_delta` via `message_update`, `tool_execution_start`, `tool_execution_end`, and `agent_settled`.

## Build the workspace chrome (PR-chrome)

**Depends on.** PR-thread.

**Files.**

- Create `src/renderer/chrome/Sidebar.tsx`, `PromptBar.tsx`, `Search.tsx`, `filter-thread.ts`.
- Edit `src/renderer/App.tsx`, `src/renderer/index.css`, `src/main/index.ts`.

**Build.**

Put auth, model, and effort into the prompt bar. Add a left sidebar for the current thread. Add a search field that filters visible blocks in the open thread. Widen the default window to 1200 by 800. Do not invent extra sessions on disk.

**You see.**

The window is a sidebar, a thread, and a prompt bar. Model and Effort sit in the prompt bar. Search hides blocks that do not match. Sign in still works. A narrow window still shows the composer.

**Check.**

`src/renderer/chrome/search.check.ts` filters a fixture thread by a query string.

## Render the official stream (PR-stream)

**Depends on.** PR-chrome.

**Files.**

- Create `src/renderer/blocks/LoadingState.tsx`, `StreamingText.tsx`, `CodeBlock.tsx`.
- Edit `src/renderer/blocks/Text.tsx`, `Thinking.tsx`, `ToolChip.tsx`, `src/renderer/App.tsx`.

**Build.**

Paint official blocks only. Loading from `agent_start` and `agent_settled` or `session.isStreaming`. Thinking from `type: "thinking"`. Streaming from `type: "text"`. Tool chips from `toolCall` plus `tool_execution_*` and `pendingToolCalls`. Code fences are a split of text, not a Pi type. Do not add TaskRow. Do not invent `ChatEvent` members for these.

**You see.**

A real prompt shows a loading state, then streaming text. A bash tool appears as a chip. If the model emits thinking, the thinking block expands. If it does not, the block is absent. A fenced region in text renders in `CodeBlock`. Untrusted model text is a text node, never `innerHTML`. Stop keeps the partial text. Scroll-up mid-stream does not jump back to the bottom.

**Check.**

`src/shared/thread.check.ts` also folds thinking content and a tool execution. A plain text delta does not create a task row.

## Out of this stack

Stay on vanilla. Rejected. One CSS file cannot carry this workspace.

Install beUI or Rare UI. Rejected. Wrong kits.

Keep vanilla and React side by side. Rejected.

Grow `ChatEvent` for thinking, tools, and tasks. Rejected. Pi already emits `AgentSessionEvent`.

Approval cards, recommendation cards, data tables, TaskRow. Rejected. No Pi feed. `beforeToolCall` and a todo extension are a later program.

Put every Beautiful UI piece in PR-shell. Rejected. The first PR proves React and host parity.

Graphite, swarm, ten CDP lanes, a 30-minute audit tick, and a perf gate. Rejected. That was execution theater. Add a perf probe only after a stream feels slow.

## Risks

`src/renderer/index.html` sets a tight CSP. Tailwind in dev may need `style-src` to allow the built file or an explicit inline exception. Already landed in PR-shell.

`AgentSessionEvent` must be structured-cloneable across IPC. Drop functions. Keep `message.content` snapshots.

Pi may never emit thinking. Hide the block. Do not fake it.

Class-heavy JSX can become a second unmaintainable file. Colors and spacing stay in `index.css` tokens.

## Reading

`src/shared/protocol.ts` before any renderer work. `src/preload/index.ts` before changing host methods. `src/main/agent-events.ts` before changing the forwarder.

Official UI stream. [AgentEvent](https://github.com/earendil-works/pi-mono/blob/main/packages/agent/src/types.ts). [AssistantMessageEvent](https://github.com/earendil-works/pi-mono/blob/main/packages/ai/src/types.ts). [sdk.md Events](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/sdk.md).

[Beautiful UI](https://beautifului.dev) is the visual brief, not a package.
