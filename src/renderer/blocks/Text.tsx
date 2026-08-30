export function Text({ text }: { text: string }) {
  return (
    <p data-role="assistant" className="mb-3 whitespace-pre-wrap text-ink">
      {text}
    </p>
  );
}
