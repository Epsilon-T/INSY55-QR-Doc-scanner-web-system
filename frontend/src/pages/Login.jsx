import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Logo from "../components/Logo.jsx";

const inputClass = "rounded-md border border-line bg-white px-3 py-2.5";

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="grid min-h-screen md:grid-cols-[1.15fr_1fr]">
      {/* Photo side: the picture fills the panel, a navy fade keeps the text readable */}
      <section className="relative isolate flex min-h-64 flex-col justify-between overflow-hidden bg-navy p-6 text-white md:min-h-screen md:p-12">
        <img
          src="/Login.jpg"
          alt=""
          className="absolute inset-0 -z-20 size-full object-cover object-[45%_50%]"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-navy via-navy/60 to-navy/10" aria-hidden="true" />

        <Logo size="size-14 md:size-20" />

        <div>
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">School University Academy</h1>
          <p className="mt-3 hidden max-w-md text-lg text-slate-100 md:block">
            Scan a student ID and see their Certificate of Registration in seconds.
          </p>
        </div>
      </section>

      {/* Sign in side */}
      <section className="grid place-items-center p-8">
        <form className="grid w-full max-w-sm gap-4" onSubmit={handleSubmit}>
          <div>
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="text-muted">Use the account your administrator gave you.</p>
          </div>

          <label className="grid gap-1 font-medium">
            School email
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>

          <div className="grid gap-1 font-medium">
            <label htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={`${inputClass} w-full pr-11`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {showPassword ? (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.2" />
                      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

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
