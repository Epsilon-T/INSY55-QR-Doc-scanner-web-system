// Form pieces shared by the student and personnel forms, so every field looks and behaves the same.

export const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2.5 transition focus:border-navy focus:outline-none focus:ring-4 focus:ring-navy/15 disabled:bg-paper disabled:text-muted";

// Added to a field that has an error
export const invalidClass = "border-bad bg-bad/5 focus:border-bad focus:ring-bad/15";

export function ChevronIcon({ open = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// A label, the field, and either the error message or a hint underneath
export function Field({ label, hint, error, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error ? (
        <span className="text-xs font-normal text-bad" role="alert">{error}</span>
      ) : (
        hint && <span className="text-xs font-normal text-muted">{hint}</span>
      )}
    </label>
  );
}

// A dropdown with our own arrow, so every dropdown looks the same (the browser's arrow varies)
export function Select({ children, invalid, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        aria-invalid={invalid ? "true" : undefined}
        className={`${inputClass} cursor-pointer appearance-none pr-10 ${invalid ? invalidClass : ""}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
        <ChevronIcon />
      </span>
    </div>
  );
}
