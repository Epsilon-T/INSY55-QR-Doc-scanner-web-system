import { useEffect, useRef } from "react";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

// A pop-up window built on the browser's native <dialog>, which always opens centered on top of
// the page, no matter how long the page is or where the user has scrolled.
export default function Modal({ title, subtitle, onClose, size = "max-w-lg", children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    document.body.style.overflow = "hidden"; // keep the page behind from scrolling
    return () => {
      document.body.style.overflow = "";
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`m-auto max-h-[90vh] w-full ${size} overflow-y-auto rounded-xl bg-white p-0 text-ink shadow-2xl backdrop:bg-black/50`}
      onCancel={(e) => {
        e.preventDefault(); // let React close it, so state stays in sync
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the dim background
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line bg-navy px-6 py-4 text-white">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-300">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <CloseIcon />
        </button>
      </div>
      {children}
    </dialog>
  );
}
