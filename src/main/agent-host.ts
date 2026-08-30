import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadAppSettings, saveAppSettings, type AppSettings } from "./app-settings";
import {
  createAgentSession,
  ModelRuntime,
  SessionManager,
  type AgentSession,
} from "@earendil-works/pi-coding-agent";
import type {
  AuthAnswer,
  ChatEvent,
  HostStatus,
  LoginInput,
  ModelOption,
  ModelRef,
  ProviderOption,
  ThinkingLevel,
} from "../shared/protocol";
import { isThinkingLevel } from "../shared/protocol";
import { toWireEvent } from "./agent-events";

type AuthPrompt = {
  type: string;
  message?: string;
  options?: readonly { id: string; label?: string }[];
  signal?: AbortSignal;
};

type AuthNotify = {
  type: string;
  url?: string;
  instructions?: string;
  message?: string;
  userCode?: string;
  verificationUri?: string;
};

type PendingAuth = {
  id: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
};

export class AgentHost {
  private runtime: ModelRuntime | undefined;
  private session: AgentSession | undefined;
  private unsubscribe: (() => void) | undefined;
  private authAbort: AbortController | undefined;
  private pendingAuth: PendingAuth | undefined;
  private authPromptSeq = 0;
  private settings: AppSettings = {};
  private get settingsPath(): string {
    return join(this.paths.dataDir, "settings.json");
  }

  constructor(
    private readonly paths: { dataDir: string; cwd: string },
    private readonly emit: (event: ChatEvent) => void,
    private readonly openUrl: (url: string) => void,
  ) {}

  async start(): Promise<void> {
    await mkdir(this.paths.dataDir, { recursive: true });
    this.settings = loadAppSettings(this.settingsPath);
    this.runtime = await ModelRuntime.create({
      authPath: join(this.paths.dataDir, "auth.json"),
      modelsPath: join(this.paths.dataDir, "models.json"),
    });
    await this.attachSession();
    this.rememberCurrent();
  }

  async status(): Promise<HostStatus> {
    return this.readStatus();
  }

  async setModel(input: ModelRef): Promise<HostStatus> {
    const session = await this.ensureSession();
    const model = (await this.requireRuntime().getAvailable()).find(
      (entry) => entry.provider === input.provider && entry.id === input.id,
    );
    if (!model) throw new Error(`Model not available: ${input.provider}/${input.id}`);
    await session.setModel(model);
    this.rememberCurrent();
    return this.readStatus();
  }

  async setThinkingLevel(level: ThinkingLevel): Promise<HostStatus> {
    if (!isThinkingLevel(level)) throw new Error(`Unknown thinking level: ${level}`);
    const session = await this.ensureSession();
    session.setThinkingLevel(level);
    this.rememberCurrent();
    return this.readStatus();
  }

  async login(input: LoginInput): Promise<HostStatus> {
    const runtime = this.requireRuntime();
    if (!input.providerId) throw new Error("Pick a provider.");
    this.cancelAuth();
    const authAbort = new AbortController();
    this.authAbort = authAbort;
    try {
      if (input.method === "api_key") {
        const key = input.apiKey.trim();
        if (!key) throw new Error("Paste an API key.");
        await runtime.login(input.providerId, "api_key", {
          signal: authAbort.signal,
          prompt: async (prompt: AuthPrompt) => this.answerApiKeyPrompt(prompt, key),
          notify: (event: AuthNotify) => this.forwardAuth(event),
        });
      } else {
        this.emit({ type: "auth_notice", text: "Starting subscription login…" });
        await runtime.login(input.providerId, "oauth", {
          signal: authAbort.signal,
          prompt: (prompt: AuthPrompt) => this.waitForAuthPrompt(prompt),
          notify: (event: AuthNotify) => this.forwardAuth(event),
        });
      }
      this.settings.providerId = input.providerId;
      await this.attachSession();
      this.rememberCurrent();
      return this.status();
    } finally {
      if (this.authAbort === authAbort) this.authAbort = undefined;
      this.failPendingAuth(new Error("Login cancelled"));
    }
  }

  answerAuth(input: AuthAnswer): void {
    const pending = this.pendingAuth;
    if (!pending || pending.id !== input.id) {
      throw new Error("No matching login prompt.");
    }
    this.pendingAuth = undefined;
    if (input.value === undefined || input.value === "") {
      pending.reject(new Error("Login cancelled"));
      return;
    }
    pending.resolve(input.value);
  }

  async prompt(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    const session = await this.ensureSession();
    this.emit({ type: "user", text: trimmed });
    try {
      await session.prompt(trimmed);
    } catch (error) {
      this.emit({ type: "error", text: messageOf(error) });
    }
  }

  async abort(): Promise<void> {
    this.cancelAuth();
    await this.session?.abort();
  }

  dispose(): void {
    this.cancelAuth();
    this.unsubscribe?.();
    this.session?.dispose();
  }

  private requireRuntime(): ModelRuntime {
    if (!this.runtime) throw new Error("Agent host is not started.");
    return this.runtime;
  }

  private async readStatus(): Promise<HostStatus> {
    const models = await this.listModels();
    const model = this.session?.model;
    return {
      providers: this.listProviders(),
      providerId: this.settings.providerId ?? model?.provider ?? null,
      models,
      model: model ? { provider: model.provider, id: model.id } : null,
      thinkingLevel: this.currentThinkingLevel(),
      thinkingLevels: this.session?.getAvailableThinkingLevels() ?? [],
    };
  }

  private currentThinkingLevel(): ThinkingLevel | null {
    const level = this.session?.thinkingLevel;
    return level && isThinkingLevel(level) ? level : null;
  }

  private async listModels(): Promise<ModelOption[]> {
    return (await this.requireRuntime().getAvailable()).map((model) => ({
      provider: model.provider,
      id: model.id,
      name: model.name,
    }));
  }

  private listProviders(): ProviderOption[] {
    const runtime = this.requireRuntime();
    const rows: ProviderOption[] = [];
    for (const provider of runtime.getProviders()) {
      const oauth = provider.auth.oauth;
      const apiKeyLogin = Boolean(provider.auth.apiKey?.login);
      if (!oauth && !apiKeyLogin) continue;
      rows.push({
        id: provider.id,
        name: provider.name,
        configured: runtime.getProviderAuthStatus(provider.id).configured,
        oauth: oauth ? { label: oauth.loginLabel ?? "Sign in" } : undefined,
        apiKey: apiKeyLogin,
      });
    }
    return rows.sort((left, right) => {
      const rank = Number(Boolean(right.oauth)) - Number(Boolean(left.oauth));
      return rank !== 0 ? rank : left.name.localeCompare(right.name);
    });
  }

  private preferredModel<T extends { provider: string; id: string }>(
    models: readonly T[],
  ): T | undefined {
    const wanted = this.settings.model;
    return (
      models.find((entry) => entry.provider === wanted?.provider && entry.id === wanted.id) ??
      models.find((entry) => entry.provider === this.settings.providerId) ??
      models[0]
    );
  }

  private async attachSession(): Promise<void> {
    const runtime = this.requireRuntime();
    const models = await runtime.getAvailable();
    const model = this.preferredModel(models);
    if (!model) return;

    if (this.session) {
      const current = this.session.model;
      const stillThere = models.some(
        (entry) => entry.provider === current?.provider && entry.id === current.id,
      );
      if (!stillThere) await this.session.setModel(model);
      return;
    }

    const created = await createAgentSession({
      cwd: this.paths.cwd,
      agentDir: this.paths.dataDir,
      modelRuntime: runtime,
      model,
      thinkingLevel: this.settings.thinkingLevel,
      tools: ["read", "bash"],
      sessionManager: SessionManager.inMemory(),
    });
    this.session = created.session;
    this.unsubscribe = this.session.subscribe((event) => {
      const wired = toWireEvent(event);
      if (wired) this.emit(wired);
    });
  }

  private rememberCurrent(): void {
    const model = this.session?.model;
    if (model) {
      this.settings.model = { provider: model.provider, id: model.id };
      this.settings.providerId = model.provider;
    }
    const level = this.currentThinkingLevel();
    if (level) this.settings.thinkingLevel = level;
    saveAppSettings(this.settingsPath, this.settings);
  }

  private async ensureSession(): Promise<AgentSession> {
    if (!this.session) await this.attachSession();
    if (!this.session) {
      throw new Error("No model yet. Sign in with a subscription first.");
    }
    return this.session;
  }

  private answerApiKeyPrompt(prompt: AuthPrompt, key: string): string {
    if (prompt.type === "secret" || prompt.type === "text") return key;
    if (prompt.type === "select") return prompt.options?.[0]?.id ?? "";
    throw new Error(`API key login cannot answer ${prompt.type}`);
  }

  private waitForAuthPrompt(prompt: AuthPrompt): Promise<string> {
    if (prompt.signal?.aborted) return Promise.reject(new Error("Login cancelled"));
    this.failPendingAuth(new Error("Login cancelled"));
    const id = `auth-${++this.authPromptSeq}`;
    return new Promise((resolve, reject) => {
      this.pendingAuth = { id, resolve, reject };
      const onAbort = () => {
        if (this.pendingAuth?.id !== id) return;
        this.pendingAuth = undefined;
        reject(new Error("Login cancelled"));
      };
      prompt.signal?.addEventListener("abort", onAbort, { once: true });
      this.emit({
        type: "auth_prompt",
        id,
        kind:
          prompt.type === "select" ||
          prompt.type === "text" ||
          prompt.type === "secret" ||
          prompt.type === "manual_code"
            ? prompt.type
            : "text",
        message: prompt.message ?? "Continue login",
        options: prompt.options?.map((option) => ({
          id: option.id,
          label: option.label ?? option.id,
        })),
      });
    });
  }

  private forwardAuth(event: AuthNotify): void {
    switch (event.type) {
      case "auth_url":
        if (event.url) this.openUrl(event.url);
        this.emit({
          type: "auth_notice",
          text: event.instructions ?? "Complete login in the browser.",
        });
        return;
      case "device_code":
        if (event.verificationUri) this.openUrl(event.verificationUri);
        this.emit({
          type: "auth_notice",
          text: event.userCode
            ? `Device code: ${event.userCode}`
            : "Complete login in the browser.",
        });
        return;
      case "info":
      case "progress":
        if (event.message) this.emit({ type: "auth_notice", text: event.message });
        return;
      default:
        return;
    }
  }

  private cancelAuth(): void {
    this.authAbort?.abort();
    this.authAbort = undefined;
    this.failPendingAuth(new Error("Login cancelled"));
  }

  private failPendingAuth(error: Error): void {
    const pending = this.pendingAuth;
    this.pendingAuth = undefined;
    pending?.reject(error);
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
