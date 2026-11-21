import { useEffect, useState } from "react";
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

// A donut chart drawn with SVG, so no chart library is needed
function Donut({ slices, total }) {
  const C = 100; // center
  const R = 92; // outer radius
  const r = 58; // inner radius
  const point = (angle, radius) => [C + radius * Math.cos(angle), C + radius * Math.sin(angle)];

  let angle = -Math.PI / 2; // start at the top
  const shapes = slices.map((s) => {
    const fraction = s.count / total;
    const tip = `${s.label}: ${s.count} ${s.count === 1 ? "student" : "students"}`;
    if (fraction > 0.9999) {
      // one slice is a full ring, which a normal arc path cannot draw
      return (
        <circle key={s.label} cx={C} cy={C} r={(R + r) / 2} fill="none" stroke={s.color} strokeWidth={R - r}>
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
      <path key={s.label} d={d} fill={s.color} stroke="#fff" strokeWidth="2">
        <title>{tip}</title>
      </path>
    );
  });

  return (
    <svg viewBox="0 0 200 200" className="size-48 shrink-0" role="img" aria-label="Students who entered, as a donut chart">
      {total === 0 ? (
        <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke="#d9dfdc" strokeWidth={R - r} />
      ) : (
        shapes
      )}
      <text x={C} y={C + 6} textAnchor="middle" className="fill-ink font-head" fontSize="36" fontWeight="700">
        {total}
      </text>
      <text x={C} y={C + 26} textAnchor="middle" className="fill-muted" fontSize="12">
        {total === 1 ? "student" : "students"}
      </text>
    </svg>
  );
}

/* ---------- Students who entered ---------- */

function EntryChart() {
  const [period, setPeriod] = useState("today");
  const [groupBy, setGroupBy] = useState("course");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false; // a slow answer for an old choice must not replace a newer one
    getEntryStats(period)
      .then((data) => {
        if (!ignore) {
          setStats(data);
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
          <Segmented label="Group by" options={GROUPS} value={groupBy} onChange={setGroupBy} />
        </div>
      </div>

      {error && <p className="text-bad" role="alert">{error}</p>}
      {!stats && !error && <p className="text-muted">Loading...</p>}

      {stats && (
        <div className={`grid items-start gap-8 ${stats.total > 0 ? "lg:grid-cols-2" : ""}`}>
          <div className="flex flex-wrap items-center gap-6">
            <Donut slices={slices} total={stats.total} />
            <div className="min-w-48 flex-1">
              {stats.total === 0 ? (
                <p className="text-muted">No students have entered in this period yet.</p>
              ) : (
                <ul className="grid gap-2.5">
                  {slices.map((s) => (
                    <li key={s.label} className="flex items-center gap-3 text-sm">
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
  const max = Math.max(1, ...logs.map((l) => l.studentEntered + l.studentDenied));

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
        <section className={panel}>
          <h2 className="mb-2 text-xl font-bold">Last 7 days</h2>
          <div className="mb-4 flex items-center gap-2 text-sm text-muted">
            <span className="size-2.5 rounded-full bg-ok" /> Entered
            <span className="ml-3 size-2.5 rounded-full bg-bad" /> Denied
          </div>
          <div className="flex h-56 items-end gap-3">
            {logs.map((l) => (
              <div className="flex h-full flex-1 flex-col items-center gap-1.5" key={l.date}>
                <div
                  className="flex w-full max-w-14 flex-1 flex-col justify-end"
                  title={`${l.studentEntered} entered, ${l.studentDenied} denied`}
                >
                  <div className="bg-bad" style={{ height: `${(l.studentDenied / max) * 100}%` }} />
                  <div className="bg-ok" style={{ height: `${(l.studentEntered / max) * 100}%` }} />
                </div>
                <span className="text-xs text-muted">{fmt(l.date)}</span>
              </div>
            ))}
          </div>
        </section>

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
