export function ToolChip({ name, ok }: { name: string; ok?: boolean }) {
  const label =
    ok === undefined ? `tool ${name}` : `tool ${name} ${ok ? "ok" : "failed"}`;
  return (
    <p data-role="tool" className="mb-3 whitespace-pre-wrap text-[13px] text-muted">
      {label}
    </p>
  );
}
