export function Sidebar({
  open,
  title,
  onToggle,
}: {
  open: boolean;
  title: string;
  onToggle: () => void;
}) {
  return (
    <aside
      id="sidebar"
      data-collapsed={!open}
      className={
        open
          ? "flex w-60 shrink-0 flex-col border-r border-line bg-panel max-[800px]:absolute max-[800px]:inset-y-0 max-[800px]:left-0 max-[800px]:z-10"
          : "flex w-10 shrink-0 flex-col items-center border-r border-line bg-panel"
      }
    >
      <button
        type="button"
        id="sidebar-toggle"
        className="m-2 rounded-md border border-line bg-bg px-2 py-1 text-xs text-ink"
        onClick={onToggle}
      >
        {open ? "Hide" : "Show"}
      </button>
      {open ? (
        <div className="px-3 py-2">
          <p className="m-0 text-xs text-muted">Thread</p>
          <p id="thread-title" className="mt-1 mb-0 break-words text-ink">
            {title}
          </p>
        </div>
      ) : null}
    </aside>
  );
}
