export function Thinking({ text }: { text: string }) {
  return (
    <details data-role="thinking" className="mb-3 text-[13px] text-muted">
      <summary className="cursor-pointer select-none">Thinking</summary>
      <p className="mt-2 mb-0 whitespace-pre-wrap">{text}</p>
    </details>
  );
}
