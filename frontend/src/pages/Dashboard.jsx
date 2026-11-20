import { useEffect, useState } from "react";
import { getDailyLogs } from "../api.js";

const fmt = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" });

const panel = "mb-5 rounded-lg border border-line bg-white p-5";

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
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted">Daily gate activity for the last 7 days.</p>

      <div className="my-5 grid gap-4 sm:grid-cols-2">
        <div className="grid rounded-lg border border-l-8 border-line border-l-ok bg-white px-5 py-4">
          <span className="font-head text-4xl font-bold">{today.studentEntered}</span>
          <span className="text-muted">Entered today</span>
        </div>
        <div className="grid rounded-lg border border-l-8 border-line border-l-bad bg-white px-5 py-4">
          <span className="font-head text-4xl font-bold">{today.studentDenied}</span>
          <span className="text-muted">Denied today</span>
        </div>
      </div>

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
    </>
  );
}
