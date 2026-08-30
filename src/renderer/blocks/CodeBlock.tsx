import { useState } from "react";

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setCopied(true);
  }

  return (
    <div data-role="code" className="mb-3 overflow-hidden rounded-md border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5 text-xs text-muted">
        <span>{lang || "code"}</span>
        <button
          type="button"
          className="rounded-sm border border-line bg-bg px-2 py-0.5 text-ink"
          onClick={() => void copy()}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="m-0 overflow-auto px-3 py-2">
        <code>{code}</code>
      </pre>
    </div>
  );
}
