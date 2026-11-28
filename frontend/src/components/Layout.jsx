import { useEffect, useState } from "react";
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
    description: (role) =>
      role === "Admin" ? "Manage student records, photos and CORs" : "Look up registered students (view only)",
    icon: icons.students,
    roles: ["Admin", "Security"],
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

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [accountOpen, setAccountOpen] = useState(false); // account menu on small screens
  const [shown, setShown] = useState(false); // flips to true just after the first paint, which starts the entrance animation

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.staffRole));
  const current =
    items.find((i) => (i.to === "/" ? pathname === "/" : pathname.startsWith(i.to))) ?? items[0];
  const activeIndex = items.indexOf(current);
  const roleText = user.staffRole === "Security" ? "Security Staff" : "Admin";
  const description = typeof current.description === "function" ? current.description(user.staffRole) : current.description;

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Esc closes the account menu
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setAccountOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accountOpen]);

  function handleLogout() {
    setAccountOpen(false);
    signOut();
    navigate("/login");
  }

  const logoutButton = (
    <button
      onClick={handleLogout}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-white/30 px-3 py-2 font-semibold transition hover:bg-white/15 active:scale-[0.98]"
    >
      {icons.logout}
      Log out
    </button>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      {/* Larger screens: sidebar with a soft gradient, a brass glow in the corner and a faint dot texture */}
      <aside className="hidden overflow-hidden bg-navy shadow-[4px_0_24px_-12px_rgba(0,0,0,0.6)] [background-image:radial-gradient(120%_55%_at_0%_0%,rgba(184,137,43,0.28),transparent_60%),linear-gradient(180deg,#24496f_0%,#1b3a5c_45%,#112741_100%)] md:sticky md:top-0 md:block md:h-screen">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:22px_22px]"
        />

        <div className="relative flex h-full flex-col text-white">
          <div className="border-b border-white/10 px-5 py-6">
            <Link to="/" aria-label="School University Academy, go to Dashboard" className="group flex items-center gap-3">
              <span className="transition duration-300 group-hover:-rotate-3 group-hover:scale-105">
                <Logo size="size-12" />
              </span>
              <span>
                <span className="block font-head text-lg font-bold leading-tight text-brass">School University Academy</span>
                <span className="mt-0.5 block text-sm text-slate-300">Student ID check</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4" aria-label="Main">
            <div className="relative space-y-1">
              {/* One highlight that slides to the page you are on */}
              {activeIndex >= 0 && (
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-14 rounded-lg bg-linear-to-r from-white/20 to-white/5 ring-1 ring-white/15 transition-transform duration-300 ease-out motion-reduce:transition-none"
                  style={{ transform: `translateY(${activeIndex * 3.75}rem)` }}
                >
                  <span className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-brass" />
                </div>
              )}

              {items.map((i, n) => (
                <div
                  key={i.to}
                  className={`h-14 transition duration-500 ease-out motion-reduce:transition-none ${
                    shown ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
                  }`}
                  style={{ transitionDelay: `${150 + n * 80}ms` }}
                >
                  <NavLink
                    to={i.to}
                    end={i.to === "/"}
                    className={({ isActive }) =>
                      `group relative flex h-full items-center gap-3 rounded-lg px-4 text-sm font-medium leading-tight transition-colors hover:bg-white/5 ${
                        isActive ? "text-white" : "text-slate-300 hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`transition duration-200 group-hover:scale-110 ${
                            isActive ? "text-brass" : "group-hover:text-brass"
                          }`}
                        >
                          {i.icon}
                        </span>
                        <span className="transition-transform duration-200 group-hover:translate-x-0.5">{i.label}</span>
                      </>
                    )}
                  </NavLink>
                </div>
              ))}
            </div>
          </nav>

          <div className="p-4">
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10 backdrop-blur">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-brass to-[#d9a93f] font-bold text-white shadow">
                  {initials(user.staffName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold leading-tight" title={user.staffName}>{user.staffName}</p>
                  <p className="text-sm text-slate-300">{roleText}</p>
                </div>
              </div>
              {logoutButton}
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Header: frosted glass, so the page softly shows through as it scrolls underneath.
            On small screens it also holds the page tabs, like the section bar in Facebook. */}
        <header className="sticky top-0 z-20 border-b border-line/70 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] md:px-8">
            <div className="flex items-center gap-2">
              <Link to="/" aria-label="School University Academy, go to Dashboard" className="transition active:scale-95 md:hidden">
                <Logo size="size-10" />
              </Link>
              <div className="hidden md:block">
                <Clock />
              </div>
            </div>

            <div className="min-w-0 text-center">
              <p className="truncate font-head text-lg font-bold leading-tight">{current.label}</p>
              <p className="hidden truncate text-sm text-muted md:block">{description}</p>
              <p className="truncate text-xs text-muted md:hidden">
                <Clock compact />
              </p>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-3">
              <div className="hidden min-w-0 text-right md:block">
                <p className="truncate font-semibold leading-tight" title={user.staffName}>
                  Welcome, {user.staffName}
                </p>
                <p className="text-sm text-muted">{roleText}</p>
              </div>

              {/* Large screens: just the initials */}
              <span
                className="hidden size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-navy to-navy-dark font-bold text-white shadow-md ring-2 ring-white md:grid"
                title={`${user.staffName} (${user.staffRole})`}
              >
                {initials(user.staffName)}
              </span>

              {/* Small screens: the initials open an account menu with Log out */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setAccountOpen((o) => !o)}
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  className="grid size-10 place-items-center rounded-full bg-linear-to-br from-navy to-navy-dark font-bold text-white shadow-md ring-2 ring-white transition active:scale-95 focus-visible:ring-brass"
                >
                  {initials(user.staffName)}
                </button>

                {accountOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setAccountOpen(false)} aria-hidden="true" />
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-white/10 bg-navy/95 p-4 text-white shadow-xl backdrop-blur"
                    >
                      <p className="font-semibold">{user.staffName}</p>
                      <p className="mb-3 text-sm text-slate-300">{roleText}</p>
                      {logoutButton}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Small screens: the page tabs. The brass underline slides to the page you are on. */}
          <nav aria-label="Main" className="relative flex border-t border-line/70 md:hidden">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === "/"}
                aria-label={i.label}
                title={i.label}
                onClick={() => setAccountOpen(false)}
                className={({ isActive }) =>
                  `grid flex-1 place-items-center py-3 transition [&>svg]:size-6 [&>svg]:transition-transform [&>svg]:duration-200 active:bg-paper ${
                    isActive ? "text-navy [&>svg]:scale-110" : "text-muted hover:text-ink"
                  }`
                }
              >
                {i.icon}
              </NavLink>
            ))}

            {activeIndex >= 0 && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-1 transition-transform duration-300 ease-out motion-reduce:transition-none"
                style={{ width: `${100 / items.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
              >
                <span className="mx-5 block h-full rounded-t-full bg-brass" />
              </span>
            )}
          </nav>
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
