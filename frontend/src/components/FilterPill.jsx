// A rounded filter button with a count. Pass a color to get a colored dot and a soft tint,
// the same look the Student page uses for courses. Without a color it is a plain "All" button.
export default function FilterPill({ label, count, color, active, onClick }) {
  const style = color
    ? {
        backgroundColor: `color-mix(in srgb, ${color} ${active ? 22 : 10}%, white)`,
        borderColor: active ? color : `color-mix(in srgb, ${color} 30%, white)`,
        boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)` : undefined,
      }
    : undefined;
  const plain = active ? "border-navy bg-navy text-white shadow" : "border-line bg-white text-muted hover:text-ink";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={style}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition hover:brightness-95 ${
        color ? "text-ink" : plain
      }`}
    >
      {color && <span className="size-2.5 rounded-full" style={{ background: color }} />}
      {label}
      <span
        className={`rounded-full px-1.5 text-xs tabular-nums ${
          color ? "bg-white/70" : active ? "bg-white/20" : "bg-line"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
