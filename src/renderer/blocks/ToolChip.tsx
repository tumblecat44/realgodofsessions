export function ToolChip({ name, ok }: { name: string; ok?: boolean }) {
  const label =
    ok === undefined ? `${name}…` : `${name} ${ok ? "ok" : "failed"}`;
  return (
    <p className="mb-3">
      <span
        data-role="tool"
        className="inline-flex rounded-full border border-line bg-panel px-2.5 py-1 text-[13px] text-muted"
      >
        {label}
      </span>
    </p>
  );
}
