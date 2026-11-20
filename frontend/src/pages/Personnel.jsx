import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../api.js";

const inputClass = "w-full rounded-md border border-line bg-white px-3 py-2.5";
const EMPTY = { staffName: "", schoolEmail: "", staffRole: "Security", password: "", confirm: "" };

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const roleLabel = (role) => (role === "Security" ? "Security Staff" : "Admin");

const th = "bg-paper px-4 py-3 text-sm font-semibold text-muted";
const td = "border-b border-line px-4 py-3.5";

function Field({ label, hint, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export default function Personnel() {
  const [staff, setStaff] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(null); // the account being edited, or null when registering
  const [fields, setFields] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const nameRef = useRef(null);

  const refresh = useCallback(
    () => api.getStaff().then(setStaff).catch((e) => setLoadError(e.message)),
    []
  );
  useEffect(() => {
    refresh();
  }, [refresh]);

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  function startEdit(account) {
    setEditing(account);
    setFields({
      staffName: account.staffName,
      schoolEmail: account.schoolEmail,
      staffRole: account.staffRole,
      password: "",
      confirm: "",
    });
    setError("");
    setSuccess("");
    // On phones the form is above the list, so bring it into view
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    nameRef.current?.focus();
  }

  function cancelEdit() {
    setEditing(null);
    setFields(EMPTY);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const wantsPassword = !editing || fields.password !== "";
    if (wantsPassword) {
      if (fields.password.length < 6) {
        setError("The password must be at least 6 characters.");
        return;
      }
      if (fields.password !== fields.confirm) {
        setError("The two passwords do not match.");
        return;
      }
    }

    setBusy(true);
    try {
      const name = fields.staffName.trim();
      const data = {
        staffName: name,
        schoolEmail: fields.schoolEmail.trim().toLowerCase(),
        staffRole: fields.staffRole,
      };
      if (wantsPassword) data.password = fields.password;

      if (editing) {
        await api.updateStaff(editing.staffID, data);
        setSuccess(`${name}'s account was updated.`);
        setEditing(null);
      } else {
        await api.addStaff(data);
        setSuccess(`${name} was registered as ${roleLabel(fields.staffRole)}.`);
      }
      setFields(EMPTY);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const passwordType = showPassword ? "text" : "password";

  return (
    <>
      <h1 className="text-3xl font-bold">Personnel Registration</h1>
      <p className="mb-6 text-muted">Create and manage login accounts for guards and other staff.</p>

      <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        {/* Registration / edit form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className={`grid scroll-mt-20 gap-4 rounded-lg border bg-white p-5 shadow-sm ${
            editing ? "border-brass" : "border-line"
          }`}
        >
          <h2 className="text-xl font-bold">{editing ? `Edit ${editing.staffName}` : "Register new personnel"}</h2>

          <Field label="Full name">
            <input ref={nameRef} className={inputClass} value={fields.staffName} onChange={set("staffName")} required />
          </Field>
          <Field label="School email" hint="They use this to log in.">
            <input type="email" className={inputClass} value={fields.schoolEmail} onChange={set("schoolEmail")} required />
          </Field>
          <Field label="Role">
            <select className={inputClass} value={fields.staffRole} onChange={set("staffRole")}>
              <option value="Security">Security Staff (guard)</option>
              <option value="Admin">Admin</option>
            </select>
          </Field>
          <Field
            label={editing ? "New password" : "Password"}
            hint={editing ? "Leave blank to keep the current password." : "At least 6 characters."}
          >
            <input
              type={passwordType}
              className={inputClass}
              value={fields.password}
              onChange={set("password")}
              autoComplete="new-password"
              required={!editing}
            />
          </Field>
          <Field label="Confirm password">
            <input
              type={passwordType}
              className={inputClass}
              value={fields.confirm}
              onChange={set("confirm")}
              autoComplete="new-password"
              required={!editing || fields.password !== ""}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            Show password
          </label>

          {error && (
            <p className="rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">{error}</p>
          )}
          {success && (
            <p className="rounded-md border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok" role="status">{success}</p>
          )}

          <div className="flex gap-3">
            <button
              disabled={busy}
              className="flex-1 rounded-md bg-navy px-5 py-2.5 font-semibold text-white hover:bg-navy-dark disabled:opacity-60"
            >
              {busy ? "Saving..." : editing ? "Save changes" : "Register"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-line bg-white px-5 py-2.5 font-semibold hover:bg-paper"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Existing accounts */}
        <section className="min-w-0">
          <h2 className="mb-3 text-xl font-bold">
            Registered personnel
            {staff && <span className="ml-2 text-base font-normal text-muted">{staff.length}</span>}
          </h2>
          {loadError && <p className="text-bad" role="alert">{loadError}</p>}
          {!staff && !loadError && <p className="text-muted">Loading personnel...</p>}
          {staff && (
            <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
              <table className="w-full min-w-[34rem] border-collapse text-left">
                <thead>
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Email</th>
                    <th className={th}>Role</th>
                    <th className={`${th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.staffID} className={editing?.staffID === s.staffID ? "bg-brass/10" : "hover:bg-paper"}>
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy/10 text-sm font-bold text-navy">
                            {initials(s.staffName)}
                          </span>
                          <span className="font-medium">{s.staffName}</span>
                        </div>
                      </td>
                      <td className={td}>{s.schoolEmail}</td>
                      <td className={td}>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                            s.staffRole === "Admin" ? "bg-brass/15 text-brass" : "bg-navy/10 text-navy"
                          }`}
                        >
                          {roleLabel(s.staffRole)}
                        </span>
                      </td>
                      <td className={td}>
                        <div className="flex justify-end">
                          <button
                            onClick={() => startEdit(s)}
                            className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-navy hover:bg-paper"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
