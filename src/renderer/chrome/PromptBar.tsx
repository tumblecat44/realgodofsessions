import { isThinkingLevel, type ChatEvent, type HostStatus, type ProviderOption } from "../../shared/protocol";

export function PromptBar({
  status,
  statusText,
  providerId,
  apiKey,
  prompt,
  authPrompt,
  authDraft,
  onProvider,
  onApiKey,
  onPrompt,
  onAuthDraft,
  onStatus,
  onStatusText,
  onHideAuth,
  onAnswerAuth,
  onThreadError,
}: {
  status: HostStatus | null;
  statusText: string;
  providerId: string;
  apiKey: string;
  prompt: string;
  authPrompt: Extract<ChatEvent, { type: "auth_prompt" }> | null;
  authDraft: string;
  onProvider: (id: string) => void;
  onApiKey: (value: string) => void;
  onPrompt: (value: string) => void;
  onAuthDraft: (value: string) => void;
  onStatus: (next: HostStatus) => void;
  onStatusText: (text: string) => void;
  onHideAuth: () => void;
  onAnswerAuth: (value?: string) => Promise<void>;
  onThreadError: (text: string) => void;
}) {
  const providers = status?.providers ?? [];
  const selected = providers.find((provider) => provider.id === providerId);

  return (
    <footer id="prompt-bar" className="border-t border-line bg-panel px-5 py-4">
      <form
        id="auth"
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!selected?.apiKey) return;
          onStatusText("Saving key…");
          try {
            const next = await window.host.login({
              method: "api_key",
              providerId: selected.id,
              apiKey,
            });
            onApiKey("");
            onHideAuth();
            onStatus(next);
          } catch (error) {
            onStatusText(error instanceof Error ? error.message : String(error));
          }
        }}
      >
        <label className="grid gap-1 text-xs text-muted">
          Provider
          <select
            id="provider"
            required
            className="min-w-48 rounded-md border border-line bg-bg px-2.5 py-2 text-ink"
            value={providerId}
            onChange={(event) => onProvider(event.target.value)}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {providerLabel(provider)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          id="oauth"
          hidden={!selected?.oauth}
          className="rounded-md border-transparent bg-accent px-3 py-2 text-accent-ink"
          onClick={async () => {
            if (!selected?.oauth) return;
            onStatusText("Starting subscription login…");
            try {
              const next = await window.host.login({
                method: "oauth",
                providerId: selected.id,
              });
              onHideAuth();
              onStatus(next);
            } catch (error) {
              onHideAuth();
              onStatusText(error instanceof Error ? error.message : String(error));
            }
          }}
        >
          {selected?.oauth?.label ?? "Sign in"}
        </button>
        <label id="key-field" hidden={!selected?.apiKey} className="grid gap-1 text-xs text-muted">
          API key
          <input
            id="key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            className="min-w-48 rounded-md border border-line bg-bg px-2.5 py-2 text-ink"
            value={apiKey}
            onChange={(event) => onApiKey(event.target.value)}
          />
        </label>
        <button
          type="submit"
          id="save-key"
          hidden={!selected?.apiKey}
          className="rounded-md border border-line bg-bg px-3 py-2 text-ink"
        >
          Save key
        </button>
        <div
          id="session"
          hidden={!status || status.models.length === 0}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="grid gap-1 text-xs text-muted">
            Model
            <select
              id="model"
              className="min-w-48 rounded-md border border-line bg-bg px-2.5 py-2 text-ink"
              value={status?.model ? `${status.model.provider}/${status.model.id}` : ""}
              onChange={async (event) => {
                const slash = event.target.value.indexOf("/");
                if (slash <= 0) return;
                try {
                  onStatus(
                    await window.host.setModel({
                      provider: event.target.value.slice(0, slash),
                      id: event.target.value.slice(slash + 1),
                    }),
                  );
                } catch (error) {
                  onStatusText(error instanceof Error ? error.message : String(error));
                }
              }}
            >
              {status?.models.map((model) => (
                <option key={`${model.provider}/${model.id}`} value={`${model.provider}/${model.id}`}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted">
            Effort
            <select
              id="thinking"
              className="min-w-48 rounded-md border border-line bg-bg px-2.5 py-2 text-ink"
              value={status?.thinkingLevel ?? ""}
              onChange={async (event) => {
                if (!isThinkingLevel(event.target.value)) return;
                try {
                  onStatus(await window.host.setThinkingLevel(event.target.value));
                } catch (error) {
                  onStatusText(error instanceof Error ? error.message : String(error));
                }
              }}
            >
              {status?.thinkingLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>

      <section id="auth-step" hidden={!authPrompt} className="mt-3 grid gap-2">
        <p id="auth-step-message" className="m-0 text-ink">
          {authPrompt?.message}
        </p>
        <div id="auth-step-options" className="flex flex-wrap items-center gap-2">
          {authPrompt?.kind === "select"
            ? authPrompt.options?.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="rounded-md border border-line bg-bg px-3 py-2 text-ink"
                  onClick={() => void onAnswerAuth(option.id)}
                >
                  {option.label}
                </button>
              ))
            : null}
        </div>
        <form
          id="auth-step-form"
          hidden={!authPrompt || authPrompt.kind === "select"}
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onAnswerAuth(authDraft);
          }}
        >
          <input
            id="auth-step-input"
            autoComplete="off"
            spellCheck={false}
            type={authPrompt?.kind === "secret" ? "password" : "text"}
            className="min-w-48 rounded-md border border-line bg-bg px-2.5 py-2 text-ink"
            value={authDraft}
            onChange={(event) => onAuthDraft(event.target.value)}
          />
          <button
            type="submit"
            className="rounded-md border-transparent bg-accent px-3 py-2 text-accent-ink"
          >
            Continue
          </button>
        </form>
        <button
          type="button"
          id="auth-cancel"
          className="w-fit rounded-md border border-line bg-bg px-3 py-2 text-ink"
          onClick={() => {
            void window.host.abort();
            onHideAuth();
            onStatusText("Login cancelled.");
          }}
        >
          Cancel login
        </button>
      </section>

      <p id="status" className="mt-2.5 mb-3 text-[13px] text-muted">
        {statusText}
      </p>

      <form
        id="composer"
        onSubmit={async (event) => {
          event.preventDefault();
          const text = prompt;
          onPrompt("");
          try {
            await window.host.prompt(text);
          } catch (error) {
            onThreadError(error instanceof Error ? error.message : String(error));
          }
        }}
      >
        <label className="sr-only" htmlFor="prompt">
          Message
        </label>
        <textarea
          id="prompt"
          rows={3}
          placeholder="Ask the local tools agent…"
          className="w-full resize-y rounded-md border border-line bg-bg px-3 py-2.5 text-ink"
          value={prompt}
          onChange={(event) => onPrompt(event.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            className="rounded-md border-transparent bg-accent px-3 py-2 text-accent-ink"
          >
            Send
          </button>
          <button
            type="button"
            id="stop"
            className="rounded-md border border-line bg-bg px-3 py-2 text-ink"
            onClick={() => void window.host.abort()}
          >
            Stop
          </button>
        </div>
      </form>
    </footer>
  );
}

function providerLabel(provider: ProviderOption): string {
  const tags = [
    provider.configured ? "saved" : undefined,
    provider.oauth ? "subscription" : undefined,
  ].filter(Boolean);
  return tags.length ? `${provider.name} (${tags.join(", ")})` : provider.name;
}
