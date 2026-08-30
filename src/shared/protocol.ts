export const IPC = {
  status: "host:status",
  login: "host:login",
  answerAuth: "host:answer-auth",
  setModel: "host:set-model",
  setThinking: "host:set-thinking",
  prompt: "host:prompt",
  abort: "host:abort",
  event: "host:event",
} as const;

export const THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

export function isThinkingLevel(value: string): value is ThinkingLevel {
  return (THINKING_LEVELS as readonly string[]).includes(value);
}

export type ModelRef = {
  provider: string;
  id: string;
};

export type ModelOption = ModelRef & {
  name: string;
};

export type ProviderOption = {
  id: string;
  name: string;
  configured: boolean;
  oauth?: { label: string };
  apiKey: boolean;
};

export type HostStatus = {
  providers: ProviderOption[];
  providerId: string | null;
  models: ModelOption[];
  model: ModelRef | null;
  thinkingLevel: ThinkingLevel | null;
  thinkingLevels: ThinkingLevel[];
};

export type LoginInput =
  | { method: "oauth"; providerId: string }
  | { method: "api_key"; providerId: string; apiKey: string };

export type AuthAnswer = {
  id: string;
  value?: string;
};

export type AuthPromptKind = "select" | "text" | "secret" | "manual_code";

export type HostEvent =
  | { type: "user"; text: string }
  | { type: "error"; text: string }
  | { type: "auth_notice"; text: string }
  | {
      type: "auth_prompt";
      id: string;
      kind: AuthPromptKind;
      message: string;
      options?: readonly { id: string; label: string }[];
    };

export type WireMessage = {
  role: string;
  content?: unknown;
};

export type WireAssistantEvent = {
  type: string;
  delta?: string;
};

export type SessionEvent =
  | { type: "agent_start" }
  | { type: "agent_settled" }
  | { type: "agent_end" }
  | { type: "message_start"; message: WireMessage }
  | { type: "message_update"; message: WireMessage; assistantMessageEvent?: WireAssistantEvent }
  | { type: "message_end"; message: WireMessage }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string }
  | { type: "tool_execution_end"; toolCallId: string; toolName: string; isError?: boolean };

export type ChatEvent = HostEvent | SessionEvent;

export type HostApi = {
  status: () => Promise<HostStatus>;
  login: (input: LoginInput) => Promise<HostStatus>;
  answerAuth: (input: AuthAnswer) => Promise<void>;
  setModel: (input: ModelRef) => Promise<HostStatus>;
  setThinkingLevel: (level: ThinkingLevel) => Promise<HostStatus>;
  prompt: (text: string) => Promise<void>;
  abort: () => Promise<void>;
  onEvent: (fn: (event: ChatEvent) => void) => () => void;
};
