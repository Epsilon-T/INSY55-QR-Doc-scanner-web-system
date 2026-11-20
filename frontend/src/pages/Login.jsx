import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

// Decorative ID card: a small fixed QR-style pattern
const SIZE = 11;
const finder = (r, c) => (r < 3 && c < 3) || (r < 3 && c >= SIZE - 3) || (r >= SIZE - 3 && c < 3);
const cells = Array.from({ length: SIZE * SIZE }, (_, i) => {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  return finder(r, c) || (r * 5 + c * 3 + r * c) % 4 < 2;
});

function IdCard() {
  return (
    <div className="w-64 -rotate-3 overflow-hidden rounded-xl bg-white text-ink shadow-2xl" aria-hidden="true">
      <div className="bg-brass px-4 py-2 font-head text-sm font-bold text-white">School University Academy</div>
      <div className="flex items-center gap-4 p-4">
        <div className="grid flex-1 gap-2">
          <span className="h-2 w-[90%] rounded bg-slate-300" />
          <span className="h-2 rounded bg-line" />
          <span className="h-2 w-[55%] rounded bg-line" />
        </div>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-20 fill-ink">
          {cells.map((on, i) =>
            on ? <rect key={i} x={i % SIZE} y={Math.floor(i / SIZE)} width="1" height="1" /> : null
          )}
        </svg>
      </div>
    </div>
  );
}

const inputClass = "rounded-md border border-line bg-white px-3 py-2.5";

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-center gap-4 bg-navy px-6 py-8 text-white md:p-12">
        <h1 className="text-3xl font-bold text-brass md:text-4xl">School University Academy</h1>
        <p className="mb-6 max-w-[32ch] text-slate-200">
          Scan a student ID and see their Certificate of Registration in seconds.
        </p>
        <IdCard />
      </section>
      <section className="grid place-items-center p-8">
        <form className="grid w-full max-w-sm gap-4" onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold">Sign in</h2>
          <label className="grid gap-1 font-medium">
            School email
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label className="grid gap-1 font-medium">
            Password
            <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="text-bad" role="alert">{error}</p>}
          <button
            disabled={busy}
            className="rounded-md bg-navy px-5 py-3 font-semibold text-white hover:bg-navy-dark disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
