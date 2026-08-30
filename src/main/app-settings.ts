import { readFileSync, writeFileSync } from "node:fs";

export type AppSettings = {
  providerId?: string;
  model?: { provider: string; id: string };
  thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
};

const THINKING = new Set<AppSettings["thinkingLevel"]>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

export function loadAppSettings(path: string): AppSettings {
  try {
    return parseAppSettings(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return {};
  }
}

export function saveAppSettings(path: string, settings: AppSettings): void {
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`);
}

export function parseAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  const settings: AppSettings = {};
  if (typeof row.providerId === "string" && row.providerId) {
    settings.providerId = row.providerId;
  }
  if (row.model && typeof row.model === "object" && !Array.isArray(row.model)) {
    const model = row.model as Record<string, unknown>;
    if (typeof model.provider === "string" && typeof model.id === "string") {
      settings.model = { provider: model.provider, id: model.id };
    }
  }
  if (typeof row.thinkingLevel === "string" && THINKING.has(row.thinkingLevel as AppSettings["thinkingLevel"])) {
    settings.thinkingLevel = row.thinkingLevel as AppSettings["thinkingLevel"];
  }
  return settings;
}
