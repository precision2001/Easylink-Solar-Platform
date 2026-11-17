"use client";

/** The «/» button that folds the side menu to icons and back. */
export function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const label = collapsed ? "Expand menu" : "Collapse menu";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={!collapsed}
      title={`${label} · sections are ordered by your use, updated weekly`}
      className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-[#9FB0C8] hover:bg-white/10 hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        <path d={collapsed ? "M13 10l2 2-2 2" : "M16 10l-2 2 2 2"} />
      </svg>
    </button>
  );
}
