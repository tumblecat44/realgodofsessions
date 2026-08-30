import { useEffect, useRef, useState } from "react";
import { type ChatEvent, type HostStatus } from "../shared/protocol";
import { foldThread, type ThreadItem } from "../shared/thread";
import { Text } from "./blocks/Text";
import { Thinking } from "./blocks/Thinking";
import { ToolChip } from "./blocks/ToolChip";
import { PromptBar } from "./chrome/PromptBar";
import { Search } from "./chrome/Search";
import { Sidebar } from "./chrome/Sidebar";
import { filterThread } from "./chrome/filter-thread";

function ThreadRow({ item }: { item: ThreadItem }) {
  switch (item.kind) {
    case "user":
      return (
        <p data-role="user" className="mb-3 whitespace-pre-wrap text-accent">
          {item.text}
        </p>
      );
    case "error":
      return (
        <p data-role="error" className="mb-3 whitespace-pre-wrap text-bad">
          {item.text}
        </p>
      );
    case "status":
      return (
        <p data-role="status" className="mb-3 whitespace-pre-wrap text-[13px] text-muted">
          {item.text}
        </p>
      );
    case "assistant":
      return (
        <div>
          {item.blocks.map((block, index) => {
            switch (block.type) {
              case "text":
                return <Text key={`text-${index}`} text={block.text} />;
              case "thinking":
                return <Thinking key={`think-${index}`} text={block.thinking} />;
              case "toolCall":
                return (
                  <ToolChip key={block.id || `tool-${index}`} name={block.name} ok={block.ok} />
                );
              default: {
                const _exhaustive: never = block;
                return _exhaustive;
              }
            }
          })}
        </div>
      );
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

export function App() {
  const [status, setStatus] = useState<HostStatus | null>(null);
  const [statusText, setStatusText] = useState("Starting…");
  const [providerId, setProviderId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authPrompt, setAuthPrompt] = useState<Extract<
    ChatEvent,
    { type: "auth_prompt" }
  > | null>(null);
  const [authDraft, setAuthDraft] = useState("");
  const logRef = useRef<HTMLElement>(null);
  const visible = filterThread(items, query);
  const title = items.find((item) => item.kind === "user")?.text ?? "New thread";

  function applyStatus(next: HostStatus): void {
    setStatus(next);
    const remembered =
      (providerId && next.providers.some((provider) => provider.id === providerId) && providerId) ||
      next.providerId ||
      next.providers.find((provider) => provider.configured)?.id ||
      next.providers[0]?.id ||
      "";
    setProviderId(remembered);
    setStatusText(
      next.model
        ? `${next.model.provider}/${next.model.id} · ${next.thinkingLevel ?? "off"}`
        : "No model yet. Sign in with a subscription.",
    );
  }

  function hideAuth(): void {
    setAuthPrompt(null);
    setAuthDraft("");
  }

  async function answerAuth(value?: string): Promise<void> {
    if (!authPrompt) return;
    const id = authPrompt.id;
    hideAuth();
    await window.host.answerAuth({ id, value });
  }

  useEffect(() => {
    const off = window.host.onEvent((event) => {
      if (event.type === "auth_notice") setStatusText(event.text);
      if (event.type === "auth_prompt") {
        setAuthPrompt(event);
        setAuthDraft("");
      }
      if (event.type === "error") hideAuth();
      setItems((current) => foldThread(current, event));
    });
    void window.host.status().then(applyStatus);
    return off;
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [visible]);

  return (
    <div className="relative flex min-h-screen">
      <Sidebar
        open={sidebarOpen}
        title={title}
        onToggle={() => setSidebarOpen((open) => !open)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Search query={query} onQuery={setQuery} />
        <main id="log" ref={logRef} aria-live="polite" className="min-h-0 flex-1 overflow-auto p-5">
          {visible.map((item, index) => (
            <ThreadRow key={`${item.kind}-${index}`} item={item} />
          ))}
        </main>
        <PromptBar
          status={status}
          statusText={statusText}
          providerId={providerId}
          apiKey={apiKey}
          prompt={prompt}
          authPrompt={authPrompt}
          authDraft={authDraft}
          onProvider={setProviderId}
          onApiKey={setApiKey}
          onPrompt={setPrompt}
          onAuthDraft={setAuthDraft}
          onStatus={applyStatus}
          onStatusText={setStatusText}
          onHideAuth={hideAuth}
          onAnswerAuth={answerAuth}
          onThreadError={(text) => setItems((current) => foldThread(current, { type: "error", text }))}
        />
      </div>
    </div>
  );
}
