import { CodeBlock } from "./CodeBlock";
import { splitFences } from "./fences";

export function Text({ text, caret }: { text: string; caret?: boolean }) {
  const parts = splitFences(text);
  return (
    <div data-role={caret ? "streaming" : "assistant"}>
      {parts.map((part, index) => {
        const last = caret && index === parts.length - 1;
        if (part.type === "code") {
          return (
            <div key={`code-${index}`}>
              <CodeBlock code={part.text} lang={part.lang} />
              {last ? <Caret /> : null}
            </div>
          );
        }
        return (
          <p key={`prose-${index}`} className="mb-3 whitespace-pre-wrap text-ink">
            {part.text}
            {last ? <Caret /> : null}
          </p>
        );
      })}
    </div>
  );
}

function Caret() {
  return (
    <span aria-hidden className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-accent" />
  );
}
