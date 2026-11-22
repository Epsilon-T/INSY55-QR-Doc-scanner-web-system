import { useEffect, useId, useState } from "react";
import { getDailyLogs, getEntryStats } from "../api.js";

const fmt = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" });

const panel = "rounded-lg border border-line bg-white p-5";

// Slice colors, picked to sit well with the navy and brass of the rest of the system
const PALETTE = ["#1b3a5c", "#b8892b", "#2e7d4f", "#5b8bb5", "#c76b4a", "#7a6fa8", "#4aa3a2", "#8d99a6"];

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];
const GROUPS = [
  { value: "course", label: "Course" },
  { value: "year", label: "Year level" },
];

/* ---------- Small pieces ---------- */

function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-line bg-paper p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1.5 font-semibold ${
            value === o.value ? "bg-navy text-white" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Counts up from 0 to the target number (and jumps straight there if the person prefers less motion)
function useCountUp(target, ms = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - t) ** 3))); // eases out
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

// A donut chart drawn with SVG, so no chart library is needed.
// It sweeps in clockwise, and the slice matching `active` pops out while the others fade.
function Donut({ slices, total, active }) {
  const maskId = useId().replace(/:/g, "");
  const [grown, setGrown] = useState(false);
  const counted = useCountUp(total);

  useEffect(() => {
    const timer = setTimeout(() => setGrown(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const C = 100; // center
  const R = 92; // outer radius
  const r = 58; // inner radius
  const mid = (R + r) / 2;
  const circumference = 2 * Math.PI * mid;
  const point = (angle, radius) => [C + radius * Math.cos(angle), C + radius * Math.sin(angle)];
  const hovered = active ? slices.find((s) => s.label === active) : null;

  let angle = -Math.PI / 2; // start at the top
  const shapes = slices.map((s) => {
    const fraction = s.count / total;
    const tip = `${s.label}: ${s.count} ${s.count === 1 ? "student" : "students"}`;
    const motion = {
      transformOrigin: `${C}px ${C}px`,
      transform: active === s.label ? "scale(1.05)" : "scale(1)",
      opacity: active && active !== s.label ? 0.4 : 1,
      transition: "transform 200ms ease-out, opacity 200ms ease-out",
    };
    if (fraction > 0.9999) {
      // one slice is a full ring, which a normal arc path cannot draw
      return (
        <circle key={s.label} cx={C} cy={C} r={mid} fill="none" stroke={s.color} strokeWidth={R - r} style={motion}>
          <title>{tip}</title>
        </circle>
      );
    }
    const start = angle;
    const end = angle + fraction * 2 * Math.PI;
    angle = end;
    const large = end - start > Math.PI ? 1 : 0;
    const [x0, y0] = point(start, R);
    const [x1, y1] = point(end, R);
    const [x2, y2] = point(end, r);
    const [x3, y3] = point(start, r);
    const d = `M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
    return (
      <path key={s.label} d={d} fill={s.color} stroke="#fff" strokeWidth="2" style={motion}>
        <title>{tip}</title>
      </path>
    );
  });

  return (
    <svg viewBox="0 0 200 200" className="size-48 shrink-0" role="img" aria-label="Students who entered, as a donut chart">
      {/* A ring that draws itself clockwise reveals the slices underneath it */}
      <mask id={maskId}>
        <circle
          cx={C}
          cy={C}
          r={mid}
          fill="none"
          stroke="#fff"
          strokeWidth={R - r + 8}
          strokeDasharray={circumference}
          strokeDashoffset={grown ? 0 : circumference}
          transform={`rotate(-90 ${C} ${C})`}
          className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
        />
      </mask>

      {total === 0 ? (
        <circle cx={C} cy={C} r={mid} fill="none" stroke="#d9dfdc" strokeWidth={R - r} />
      ) : (
        <g mask={`url(#${maskId})`}>{shapes}</g>
      )}

      <text x={C} y={C + 6} textAnchor="middle" className="fill-ink font-head" fontSize="36" fontWeight="700">
        {hovered ? hovered.count : counted}
      </text>
      <text x={C} y={C + 26} textAnchor="middle" className="fill-muted" fontSize="12">
        {hovered ? hovered.label : total === 1 ? "student" : "students"}
      </text>
    </svg>
  );
}

/* ---------- Students who entered ---------- */

function EntryChart() {
  const [period, setPeriod] = useState("today");
  const [groupBy, setGroupBy] = useState("course");
  const [stats, setStats] = useState(null);
  const [version, setVersion] = useState(0); // goes up with each new answer, so the donut replays its animation
  const [active, setActive] = useState(null); // the slice or legend row being hovered
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false; // a slow answer for an old choice must not replace a newer one
    getEntryStats(period)
      .then((data) => {
        if (!ignore) {
          setStats(data);
          setVersion((v) => v + 1);
          setError("");
        }
      })
      .catch((e) => !ignore && setError(e.message));
    return () => {
      ignore = true;
    };
  }, [period]);

  const list = stats ? (groupBy === "course" ? stats.byCourse : stats.byYear) : [];
  const slices = list.map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }));
  const yearTotals = stats
    ? stats.yearColumns.map((y) => stats.matrix.reduce((n, row) => n + (row.years[y] ?? 0), 0))
    : [];

  return (
    <section className={panel}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Students who entered</h2>
          <p className="text-sm text-muted">Each student is counted once, even if they scanned more than once.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Segmented label="Time period" options={PERIODS} value={period} onChange={setPeriod} />
          <Segmented
            label="Group by"
            options={GROUPS}
            value={groupBy}
            onChange={(v) => {
              setGroupBy(v);
              setActive(null);
            }}
          />
        </div>
      </div>

      {error && <p className="text-bad" role="alert">{error}</p>}
      {!stats && !error && <p className="text-muted">Loading...</p>}

      {stats && (
        <div className={`grid items-start gap-8 ${stats.total > 0 ? "lg:grid-cols-2" : ""}`}>
          <div className="flex flex-wrap items-center gap-6">
            <Donut key={`${version}-${groupBy}`} slices={slices} total={stats.total} active={active} />
            <div className="min-w-48 flex-1">
              {stats.total === 0 ? (
                <p className="text-muted">No students have entered in this period yet.</p>
              ) : (
                <ul className="grid gap-2.5">
                  {slices.map((s) => (
                    <li
                      key={s.label}
                      tabIndex={0}
                      onMouseEnter={() => setActive(s.label)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(s.label)}
                      onBlur={() => setActive(null)}
                      className={`-mx-2 flex items-center gap-3 rounded-md px-2 py-1 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brass ${
                        active === s.label ? "bg-paper" : ""
                      } ${active && active !== s.label ? "opacity-50" : ""}`}
                    >
                      <span className="size-3 shrink-0 rounded-sm" style={{ background: s.color }} />
                      <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
                      <span className="font-semibold tabular-nums">{s.count}</span>
                      <span className="w-12 text-right tabular-nums text-muted">
                        {Math.round((s.count / stats.total) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {stats.total > 0 && (
            <div className="min-w-0">
              <h3 className="mb-2 font-semibold">By course and year level</h3>
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-paper text-muted">
                      <th className="px-3 py-2 font-semibold">Course</th>
                      {stats.yearColumns.map((y) => (
                        <th key={y} className="px-3 py-2 text-right font-semibold">{y.replace(" Year", "")}</th>
                      ))}
                      <th className="px-3 py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.matrix.map((row) => (
                      <tr key={row.course} className="border-t border-line">
                        <td className="px-3 py-2 font-medium">{row.course}</td>
                        {stats.yearColumns.map((y) => (
                          <td key={y} className="px-3 py-2 text-right tabular-nums">{row.years[y] ?? 0}</td>
                        ))}
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line bg-paper font-semibold">
                      <td className="px-3 py-2">All courses</td>
                      {yearTotals.map((n, i) => (
                        <td key={stats.yearColumns[i]} className="px-3 py-2 text-right tabular-nums">{n}</td>
                      ))}
                      <td className="px-3 py-2 text-right tabular-nums">{stats.total}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Last 7 days ---------- */

// Rounds up to a tidy axis step (1, 2, 3, 4, 5, 6, 8, 10, 20, 30, ...) so the grid lines show whole numbers
function niceStep(raw) {
  const unit = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  for (const m of [1, 2, 3, 4, 5, 6, 8, 10]) {
    if (m * unit >= raw) return m * unit;
  }
  return 10 * unit;
}

const longDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric" });

function WeeklyChart({ logs }) {
  const [grown, setGrown] = useState(false); // starts false so the bars begin flat, then grow
  const [active, setActive] = useState(null); // the column being hovered or focused

  useEffect(() => {
    const timer = setTimeout(() => setGrown(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const step = niceStep(Math.max(...logs.map((l) => l.studentEntered + l.studentDenied)) / 4);
  const top = step * 4;
  const ticks = [1, 2, 3, 4].map((i) => i * step);

  return (
    <section className={panel}>
      <h2 className="mb-2 text-xl font-bold">Last 7 days</h2>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <span className="size-2.5 rounded-full bg-ok" /> Entered
        <span className="ml-3 size-2.5 rounded-full bg-bad" /> Denied
      </div>

      <div className="relative mt-8 h-64 pl-9">
        {/* grid lines and the numbers on the left */}
        <div className="pointer-events-none absolute inset-x-0 inset-y-0 pb-7" aria-hidden="true">
          <div className="relative h-full">
            <div className="absolute inset-x-0 bottom-0 flex items-center">
              <span className="w-9 pr-2 text-right text-xs tabular-nums text-muted">0</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 flex translate-y-1/2 items-center" style={{ bottom: `${(t / top) * 100}%` }}>
                <span className="w-9 pr-2 text-right text-xs tabular-nums text-muted">{t}</span>
                <span className="h-px flex-1 bg-line/70" />
              </div>
            ))}
          </div>
        </div>

        {/* one column per day */}
        <div className="relative flex h-full gap-3">
          {logs.map((l, i) => {
            const total = l.studentEntered + l.studentDenied;
            const delay = i * 70;
            const isToday = i === logs.length - 1;
            const heightPct = (total / top) * 100;
            return (
              <div
                key={l.date}
                tabIndex={0}
                aria-label={`${longDate(l.date)}: ${l.studentEntered} entered, ${l.studentDenied} denied`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={`relative flex h-full min-w-0 flex-1 flex-col items-center rounded-md outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-brass ${
                  active !== null && active !== i ? "opacity-50" : ""
                }`}
              >
                <div className="relative flex w-full flex-1 items-end justify-center">
                  {active === i && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-3 py-2 text-xs text-white shadow-lg"
                      style={{ bottom: `calc(${grown ? heightPct : 0}% + 1.75rem)` }}
                    >
                      <p className="mb-1 font-semibold">{longDate(l.date)}</p>
                      <p className="flex items-center gap-2"><span className="size-2 rounded-full bg-ok" /> {l.studentEntered} entered</p>
                      <p className="flex items-center gap-2"><span className="size-2 rounded-full bg-bad" /> {l.studentDenied} denied</p>
                    </div>
                  )}

                  {total === 0 ? (
                    <div className="h-0.5 w-full max-w-16 rounded bg-line" />
                  ) : (
                    <div
                      className="relative flex w-full max-w-16 flex-col justify-end transition-[height] duration-700 ease-out motion-reduce:transition-none"
                      style={{ height: grown ? `${heightPct}%` : "0%", transitionDelay: `${delay}ms` }}
                    >
                      <span
                        className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-semibold tabular-nums transition-opacity duration-500 motion-reduce:transition-none"
                        style={{ opacity: grown ? 1 : 0, transitionDelay: `${delay + 500}ms` }}
                      >
                        {total}
                      </span>
                      <div
                        className={`flex h-full flex-col overflow-hidden rounded-t-md transition-[filter] duration-200 ${
                          active === i ? "brightness-110" : ""
                        }`}
                      >
                        <div className="bg-bad" style={{ flex: `${l.studentDenied} 1 0%` }} />
                        <div className="bg-ok" style={{ flex: `${l.studentEntered} 1 0%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <span className={`h-7 pt-2 text-xs ${isToday ? "font-bold text-ink" : "text-muted"}`}>
                  {isToday ? "Today" : fmt(l.date)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Page ---------- */

export default function Dashboard() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDailyLogs(7).then(setLogs).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-bad" role="alert">{error}</p>;
  if (!logs) return <p className="text-muted">Loading daily numbers...</p>;

  const today = logs[logs.length - 1];

  return (
    <>
      <h1 className="sr-only">Dashboard</h1>

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="grid rounded-lg border border-l-8 border-line border-l-ok bg-white px-5 py-4">
          <span className="font-head text-4xl font-bold">{today.studentEntered}</span>
          <span className="text-muted">Entered today</span>
        </div>
        <div className="grid rounded-lg border border-l-8 border-line border-l-bad bg-white px-5 py-4">
          <span className="font-head text-4xl font-bold">{today.studentDenied}</span>
          <span className="text-muted">Denied today</span>
        </div>
      </div>

      <div className="mb-5 grid gap-5">
        <WeeklyChart logs={logs} />

        <section className={panel}>
          <h2 className="mb-2 text-xl font-bold">Daily log</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-muted">
                  <th className="border-b border-line px-2 py-2.5 font-semibold">Date</th>
                  <th className="border-b border-line px-2 py-2.5 font-semibold">Entered</th>
                  <th className="border-b border-line px-2 py-2.5 font-semibold">Denied</th>
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().map((l) => (
                  <tr key={l.date}>
                    <td className="border-b border-line px-2 py-2.5">{fmt(l.date)}</td>
                    <td className="border-b border-line px-2 py-2.5">{l.studentEntered}</td>
                    <td className="border-b border-line px-2 py-2.5">{l.studentDenied}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <EntryChart />
    </>
  );
}
