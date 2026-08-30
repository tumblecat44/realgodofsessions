import type { SessionEvent, WireAssistantEvent, WireMessage } from "../shared/protocol";

export function toWireEvent(event: { type: string }): SessionEvent | undefined {
  switch (event.type) {
    case "agent_start":
      return { type: "agent_start" };
    case "agent_settled":
      return { type: "agent_settled" };
    case "agent_end":
      return { type: "agent_end" };
    case "message_start":
    case "message_end":
      return { type: event.type, message: pickMessage(field(event, "message")) };
    case "message_update":
      return {
        type: "message_update",
        message: pickMessage(field(event, "message")),
        assistantMessageEvent: pickInner(field(event, "assistantMessageEvent")),
      };
    case "tool_execution_start": {
      const toolCallId = stringField(event, "toolCallId");
      const toolName = stringField(event, "toolName");
      if (!toolCallId && !toolName) return undefined;
      return { type: "tool_execution_start", toolCallId, toolName };
    }
    case "tool_execution_end": {
      const toolCallId = stringField(event, "toolCallId");
      const toolName = stringField(event, "toolName");
      if (!toolCallId && !toolName) return undefined;
      return {
        type: "tool_execution_end",
        toolCallId,
        toolName,
        isError: field(event, "isError") === true,
      };
    }
    default:
      return undefined;
  }
}

function pickMessage(value: unknown): WireMessage {
  if (!isRecord(value) || typeof value.role !== "string") return { role: "unknown" };
  return { role: value.role, content: value.content };
}

function pickInner(value: unknown): WireAssistantEvent | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  return {
    type: value.type,
    delta: typeof value.delta === "string" ? value.delta : undefined,
  };
}

function field(event: { type: string }, key: string): unknown {
  return key in event ? (event as Record<string, unknown>)[key] : undefined;
}

function stringField(event: { type: string }, key: string): string {
  const value = field(event, key);
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
