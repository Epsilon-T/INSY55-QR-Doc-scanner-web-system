import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Logo from "../components/Logo.jsx";

const inputClass =
  "w-full rounded-lg border border-line bg-white py-3 pl-11 pr-3 transition focus:border-navy focus:outline-none focus:ring-4 focus:ring-navy/15";

function Icon({ children, className = "size-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const CHIPS = ["Scan the QR code", "Check the COR", "Match the face"];

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(false); // flips to true just after the page appears, which starts the entrance animation
  const cardRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (user) return <Navigate to="/" replace />;

  // Fade-and-rise entrance, one step later for each item
  const reveal = (step, extra = "") => ({
    className: `transition duration-700 ease-out motion-reduce:transition-none ${extra} ${
      shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    }`,
    style: { transitionDelay: `${step * 90}ms` },
  });

  function shake() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cardRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-10px)" },
        { transform: "translateX(10px)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 400, easing: "ease-in-out" }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message);
      shake();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[1.15fr_1fr]">
      {/* Photo side: the picture slowly settles in, a navy fade keeps the text readable */}
      <section className="relative isolate flex min-h-64 flex-col justify-between overflow-hidden bg-navy p-6 text-white md:min-h-screen md:p-12">
        <img
          src="/Login.jpg"
          alt=""
          className={`absolute inset-0 -z-20 size-full object-cover object-[45%_50%] transition-transform duration-[8000ms] ease-out motion-reduce:transition-none ${
            shown ? "scale-100" : "scale-110"
          }`}
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-navy via-navy/60 to-navy/10" aria-hidden="true" />

        <div {...reveal(0)}>
          <Logo size="size-14 md:size-20" />
        </div>

        <div>
          <h1 {...reveal(1, "text-3xl font-bold leading-tight md:text-5xl")}>School University Academy</h1>
          <p {...reveal(2, "mt-3 hidden max-w-md text-lg text-slate-100 md:block")}>
            Scan a student ID and see their Certificate of Registration in seconds.
          </p>
          <ul {...reveal(3, "mt-5 hidden flex-wrap gap-2 md:flex")}>
            {CHIPS.map((chip) => (
              <li key={chip} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm backdrop-blur">
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sign in side */}
      <section className="relative z-10 -mt-6 grid place-items-center rounded-t-3xl bg-paper p-6 [background-image:radial-gradient(circle_at_1px_1px,#d9dfdc_1px,transparent_0)] [background-size:24px_24px] md:mt-0 md:rounded-none md:p-10">
        <div className="w-full max-w-md">
          <div ref={cardRef} className="rounded-2xl border border-line bg-white p-7 shadow-xl shadow-navy/10 md:p-9">
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div {...reveal(1)}>
                <h2 className="text-3xl font-bold">Welcome back</h2>
                <p className="mt-1 text-muted">Sign in with the account your administrator gave you.</p>
              </div>

              <div {...reveal(2, "grid gap-1.5")}>
                <label htmlFor="email" className="text-sm font-medium">School email</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                    <Icon>
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </Icon>
                  </span>
                  <input
                    id="email"
                    type="email"
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    placeholder="name@school.edu"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div {...reveal(3, "grid gap-1.5")}>
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                    <Icon>
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </Icon>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={`${inputClass} pr-11`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition hover:text-ink"
                  >
                    {showPassword ? (
                      <Icon>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.2" />
                        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                      </Icon>
                    ) : (
                      <Icon>
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </Icon>
                    )}
                  </button>
                </div>
                {capsLock && <p className="text-sm text-brass">Caps Lock is on.</p>}
              </div>

              {error && (
                <p className="flex items-start gap-2 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2.5 text-sm text-bad" role="alert">
                  <Icon className="mt-0.5 size-4 shrink-0">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16h.01" />
                  </Icon>
                  {error}
                </p>
              )}

              <div {...reveal(4)}>
              <button
                disabled={busy}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-5 py-3.5 font-semibold text-white shadow-md shadow-navy/20 transition hover:-translate-y-0.5 hover:bg-navy-dark hover:shadow-lg active:translate-y-0 disabled:opacity-70"
              >
                {busy ? (
                  <>
                    <Icon className="size-5 animate-spin">
                      <path d="M12 3a9 9 0 1 0 9 9" />
                    </Icon>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <Icon className="size-5 transition-transform group-hover:translate-x-1">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </Icon>
                  </>
                )}
              </button>
              </div>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-muted">
            &copy; {new Date().getFullYear()} School University Academy
          </p>
        </div>
      </section>
    </div>
  );
}
