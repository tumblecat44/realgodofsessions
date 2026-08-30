export function Thinking({ text }: { text: string }) {
  return (
    <p data-role="thinking" className="mb-3 whitespace-pre-wrap text-[13px] text-muted">
      {text}
    </p>
  );
}
