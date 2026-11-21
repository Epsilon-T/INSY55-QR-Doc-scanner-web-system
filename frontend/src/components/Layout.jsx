import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Logo from "./Logo.jsx";

function Icon({ children, className = "size-5 shrink-0" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const icons = {
  dashboard: (
    <Icon>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Icon>
  ),
  students: (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
      <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.8c1.9.7 3.2 2.4 3.5 5.2" />
    </Icon>
  ),
  personnel: (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5 1.6 0 3 .4 4.2 1.2" />
      <path d="M19 8v6M16 11h6" />
    </Icon>
  ),
  scanner: (
    <Icon>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M4 12h16" />
    </Icon>
  ),
  menu: (
    <Icon>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  ),
  close: (
    <Icon>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  ),
  logout: (
    <Icon>
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <path d="m16 8 4 4-4 4M20 12H9" />
    </Icon>
  ),
};

// Every page in the navbar. `roles` decides who sees it.
const NAV_ITEMS = [
  {
    to: "/",
    label: "Dashboard",
    description: "A summary of the daily gate activity",
    icon: icons.dashboard,
    roles: ["Admin", "Security"],
  },
  {
    to: "/students",
    label: "Student Information Management",
    description: "Manage student records, photos and CORs",
    icon: icons.students,
    roles: ["Admin"],
  },
  {
    to: "/personnel",
    label: "Personnel Registration",
    description: "Create and manage staff login accounts",
    icon: icons.personnel,
    roles: ["Admin"],
  },
  {
    to: "/scanner",
    label: "Mobile QR Scanner",
    description: "Scan a student ID to check their COR",
    icon: icons.scanner,
    roles: ["Security"],
  },
];

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

// Live clock. It keeps its own timer, so only this small part redraws every second.
function Clock({ compact = false }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const date = now.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
  if (compact) {
    const time = now.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
    return <span className="tabular-nums">{time} | {date}</span>;
  }
  const time = now.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit" });
  return (
    <div className="leading-tight">
      <p className="font-head text-xl font-bold tabular-nums">{time}</p>
      <p className="text-sm text-muted">{date}</p>
    </div>
  );
}

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-md border-l-4 px-3 py-2.5 font-medium ${
    isActive
      ? "border-brass bg-white/10 text-white"
      : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
  }`;

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false); // slide-in menu on small screens
  const closeRef = useRef(null);

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.staffRole));
  const current =
    items.find((i) => (i.to === "/" ? pathname === "/" : pathname.startsWith(i.to))) ?? items[0];

  // While the menu is open: Escape closes it, the page behind can't scroll,
  // focus moves into the menu, and it closes if the window grows to desktop size.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const wide = window.matchMedia("(min-width: 768px)");
    const onWide = (e) => e.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleLogout() {
    setOpen(false);
    signOut();
    navigate("/login");
  }

  const logoutButton = (
    <button
      onClick={handleLogout}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-white/40 px-3 py-2 font-semibold hover:bg-white/10"
    >
      {icons.logout}
      Log out
    </button>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      {/* Small screens: dim the page, then slide a full-height menu in from the left */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside
        id="mobile-menu"
        aria-label="Menu"
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col bg-navy text-white shadow-2xl transition-[transform,visibility] duration-200 motion-reduce:transition-none md:hidden ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-5">
          <Link to="/" onClick={() => setOpen(false)} aria-label="School University Academy, go to Dashboard" className="flex min-w-0 items-center gap-3">
            <Logo size="size-12" />
            <span>
              <span className="block font-head text-lg font-bold leading-tight text-brass">School University Academy</span>
              <span className="mt-0.5 block text-sm text-slate-300">Student ID check</span>
            </span>
          </Link>
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            {icons.close}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === "/"} className={linkClass} onClick={() => setOpen(false)}>
              {i.icon}
              {i.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="font-semibold">{user.staffName}</p>
          <p className="mb-3 text-sm text-slate-300">{user.staffRole}</p>
          {logoutButton}
        </div>
      </aside>

      {/* Larger screens: sidebar */}
      <aside className="hidden flex-col bg-navy text-white md:sticky md:top-0 md:flex md:h-screen">
        <div className="border-b border-white/10 px-5 py-6">
          <Link to="/" aria-label="School University Academy, go to Dashboard" className="flex items-center gap-3">
            <Logo size="size-12" />
            <span>
              <span className="block font-head text-lg font-bold leading-tight text-brass">School University Academy</span>
              <span className="mt-0.5 block text-sm text-slate-300">Student ID check</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === "/"} className={linkClass}>
              {i.icon}
              {i.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="font-semibold">{user.staffName}</p>
          <p className="mb-3 text-sm text-slate-300">{user.staffRole}</p>
          {logoutButton}
        </div>
      </aside>

      <div className="min-w-0">
        {/* Header: clock on the left, page description in the middle, welcome on the right */}
        <header className="sticky top-0 z-20 border-b border-line bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] md:px-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
                aria-controls="mobile-menu"
                className="rounded-md border border-line p-2 hover:bg-paper md:hidden"
              >
                {icons.menu}
              </button>
              <Link to="/" aria-label="School University Academy, go to Dashboard" className="md:hidden">
                <Logo size="size-10" />
              </Link>
              <div className="hidden md:block">
                <Clock />
              </div>
            </div>

            <div className="min-w-0 text-center">
              <p className="truncate font-head text-lg font-bold leading-tight">{current.label}</p>
              <p className="hidden truncate text-sm text-muted md:block">{current.description}</p>
              <p className="truncate text-xs text-muted md:hidden">
                <Clock compact />
              </p>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-3">
              <div className="hidden min-w-0 text-right md:block">
                <p className="truncate font-semibold leading-tight" title={user.staffName}>
                  Welcome, {user.staffName}
                </p>
                <p className="text-sm text-muted">{user.staffRole === "Security" ? "Security Staff" : "Admin"}</p>
              </div>
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full bg-navy font-bold text-white"
                title={`${user.staffName} (${user.staffRole})`}
              >
                {initials(user.staffName)}
              </span>
            </div>
          </div>
        </header>

        <main className="px-5 pb-12 pt-7 md:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
