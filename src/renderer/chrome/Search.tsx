export function Search({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 border-b border-line bg-panel px-4 py-2 text-xs text-muted">
      Search
      <input
        id="search"
        value={query}
        autoComplete="off"
        spellCheck={false}
        className="rounded-md border border-line bg-bg px-2.5 py-2 text-[15px] text-ink"
        onChange={(event) => onQuery(event.target.value)}
      />
    </label>
  );
}
