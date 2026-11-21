import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal.jsx";
import * as api from "../api.js";
import { useAuth } from "../auth.jsx";

const inputClass = "w-full rounded-md border border-line bg-white px-3 py-2.5";
const btnPrimary =
  "rounded-md bg-navy px-5 py-2.5 font-semibold text-white hover:bg-navy-dark disabled:opacity-60";
const btnSecondary = "rounded-md border border-line bg-white px-5 py-2.5 font-semibold hover:bg-paper";
const btnDanger = "rounded-md bg-bad px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60";
const btnSmall = "rounded-md border bg-white px-3 py-1.5 text-sm font-semibold";
const th = "bg-paper px-4 py-3 text-sm font-semibold text-muted";
const td = "border-b border-line px-4 py-3.5";

const EMPTY = { staffName: "", schoolEmail: "", staffRole: "Security", password: "", confirm: "" };

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const roleLabel = (role) => (role === "Security" ? "Security Staff" : "Admin");

// The two groups shown on the page, in this order
const GROUPS = [
  { role: "Admin", title: "Admins", about: "Can manage students and personnel", empty: "No admins yet." },
  { role: "Security", title: "Security Staff", about: "Can scan student IDs at the gate", empty: "No security staff yet." },
];

/* ---------- Small pieces ---------- */

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

function StatCard({ value, label, about, accent }) {
  return (
    <div className={`grid rounded-lg border border-l-8 border-line bg-white px-5 py-4 ${accent}`}>
      <span className="font-head text-4xl font-bold leading-none">{value}</span>
      <span className="mt-2 font-semibold">{label}</span>
      <span className="text-sm text-muted">{about}</span>
    </div>
  );
}

/* ---------- Pop-up form (register and edit) ---------- */

function StaffForm({ account, onSave, onCancel }) {
  const isEdit = Boolean(account);
  const [fields, setFields] = useState(
    isEdit
      ? { staffName: account.staffName, schoolEmail: account.schoolEmail, staffRole: account.staffRole, password: "", confirm: "" }
      : EMPTY
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));
  const passwordType = showPassword ? "text" : "password";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // New accounts need a password. When editing, a blank password keeps the current one.
    const wantsPassword = !isEdit || fields.password !== "";
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

    const data = {
      staffName: fields.staffName.trim(),
      schoolEmail: fields.schoolEmail.trim().toLowerCase(),
      staffRole: fields.staffRole,
    };
    if (wantsPassword) data.password = fields.password;

    setBusy(true);
    try {
      await onSave(data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 p-6">
        <Field label="Full name">
          <input className={inputClass} value={fields.staffName} onChange={set("staffName")} required />
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={isEdit ? "New password" : "Password"}
            hint={isEdit ? "Leave blank to keep the current one." : "At least 6 characters."}
          >
            <input
              type={passwordType}
              className={inputClass}
              value={fields.password}
              onChange={set("password")}
              autoComplete="new-password"
              required={!isEdit}
            />
          </Field>
          <Field label="Confirm password">
            <input
              type={passwordType}
              className={inputClass}
              value={fields.confirm}
              onChange={set("confirm")}
              autoComplete="new-password"
              required={!isEdit || fields.password !== ""}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
          Show password
        </label>
      </div>

      {error && (
        <p className="mx-6 mb-4 rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-line bg-paper px-6 py-4">
        <button type="button" className={btnSecondary} onClick={onCancel}>Cancel</button>
        <button className={btnPrimary} disabled={busy}>
          {busy ? "Saving..." : isEdit ? "Save changes" : "Register"}
        </button>
      </div>
    </form>
  );
}

/* ---------- Page ---------- */

export default function Personnel() {
  const { user } = useAuth();
  const [staff, setStaff] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // { type: "add" | "edit" | "delete", account? }
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState(null); // message above the list: { kind: "ok" | "bad", text }

  const refresh = useCallback(
    () => api.getStaff().then(setStaff).catch((e) => setLoadError(e.message)),
    []
  );
  useEffect(() => {
    refresh();
  }, [refresh]);

  // The confirmation message fades away by itself
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 6000);
    return () => clearTimeout(timer);
  }, [note]);

  const closeModal = useCallback(() => setModal(null), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!staff) return [];
    if (!q) return staff;
    return staff.filter((s) =>
      [s.staffName, s.schoolEmail, roleLabel(s.staffRole)].some((v) => v.toLowerCase().includes(q))
    );
  }, [staff, query]);

  const searching = query.trim() !== "";
  const total = staff?.length ?? 0;
  const adminCount = staff?.filter((s) => s.staffRole === "Admin").length ?? 0;
  const securityCount = total - adminCount;

  async function handleSave(data) {
    if (modal.type === "edit") {
      await api.updateStaff(modal.account.staffID, data);
      setNote({ kind: "ok", text: `${data.staffName}'s account was updated.` });
    } else {
      await api.addStaff(data);
      setNote({ kind: "ok", text: `${data.staffName} was registered as ${roleLabel(data.staffRole)}.` });
    }
    await refresh();
    closeModal();
  }

  async function handleDelete() {
    const account = modal.account;
    setDeleting(true);
    try {
      await api.deleteStaff(account.staffID);
      setNote({ kind: "ok", text: `${account.staffName}'s account was deleted.` });
      await refresh();
    } catch (err) {
      setNote({ kind: "bad", text: err.message });
    } finally {
      setDeleting(false);
      closeModal();
    }
  }

  if (loadError) return <p className="text-bad" role="alert">{loadError}</p>;
  if (!staff) return <p className="text-muted">Loading personnel...</p>;

  const sections = GROUPS.map((g) => ({ ...g, list: visible.filter((s) => s.staffRole === g.role) }));

  return (
    <>
      <h1 className="sr-only">Personnel Registration</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard value={total} label="Total personnel" about="Accounts that can log in" accent="border-l-navy" />
        <StatCard value={adminCount} label={adminCount === 1 ? "Admin" : "Admins"} about="Manage students and personnel" accent="border-l-brass" />
        <StatCard value={securityCount} label="Security staff" about="Scan student IDs at the gate" accent="border-l-ok" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            className="w-full rounded-md border border-line bg-white py-2.5 pl-10 pr-3"
            type="search"
            placeholder="Search by name, email or role"
            aria-label="Search personnel"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted">Showing {visible.length} of {total} personnel</p>
          <button className={btnPrimary} onClick={() => setModal({ type: "add" })}>Register personnel</button>
        </div>
      </div>

      {note && (
        <p
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            note.kind === "ok" ? "border-ok/30 bg-ok/10 text-ok" : "border-bad/30 bg-bad/10 text-bad"
          }`}
          role={note.kind === "ok" ? "status" : "alert"}
        >
          {note.text}
        </p>
      )}

      {searching && visible.length === 0 && (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center text-muted">
          No personnel match your search.
        </p>
      )}

      <div className="grid gap-5">
        {sections.map((g) => {
          if (searching && g.list.length === 0) return null;
          return (
            <section key={g.role} className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 bg-navy px-5 py-3.5 text-white">
                <h2 className="text-xl font-bold">{g.title}</h2>
                <span className="text-sm text-slate-300">
                  {g.list.length} {g.list.length === 1 ? "account" : "accounts"}
                </span>
                <span className="text-sm text-slate-300 sm:ml-auto">{g.about}</span>
              </div>

              {g.list.length === 0 ? (
                <p className="px-5 py-8 text-center text-muted">{g.empty}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] table-fixed border-collapse text-left">
                    <colgroup>
                      <col className="w-1/3" />
                      <col />
                      <col className="w-44" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={th}>Name</th>
                        <th className={th}>Email</th>
                        <th className={`${th} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.list.map((s) => (
                        <tr key={s.staffID} className="hover:bg-paper">
                          <td className={td}>
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy/10 text-sm font-bold text-navy">
                                {initials(s.staffName)}
                              </span>
                              <span className="min-w-0 truncate font-medium" title={s.staffName}>{s.staffName}</span>
                            </div>
                          </td>
                          <td className={td}>
                            <span className="block truncate" title={s.schoolEmail}>{s.schoolEmail}</span>
                          </td>
                          <td className={td}>
                            <div className="flex justify-end gap-2">
                              <button
                                className={`${btnSmall} border-line text-navy hover:bg-paper`}
                                onClick={() => setModal({ type: "edit", account: s })}
                              >
                                Edit
                              </button>
                              <button
                                className={`${btnSmall} border-bad/30 text-bad hover:bg-bad/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white`}
                                onClick={() => setModal({ type: "delete", account: s })}
                                disabled={s.staffID === user.staffID}
                                title={s.staffID === user.staffID ? "You can't delete your own account" : undefined}
                              >
                                Delete
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
          );
        })}
      </div>

      {(modal?.type === "add" || modal?.type === "edit") && (
        <Modal
          title={modal.type === "add" ? "Register personnel" : "Edit personnel"}
          subtitle={
            modal.type === "add"
              ? "Create a login account for a guard or other staff member."
              : `${modal.account.staffName} (${modal.account.schoolEmail})`
          }
          size="max-w-lg"
          onClose={closeModal}
        >
          <StaffForm account={modal.account} onSave={handleSave} onCancel={closeModal} />
        </Modal>
      )}

      {modal?.type === "delete" && (
        <Modal title="Delete account" size="max-w-md" onClose={closeModal}>
          <p className="p-6">
            Delete <strong>{modal.account.staffName}</strong> ({modal.account.schoolEmail})? They will no longer be
            able to log in. This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 border-t border-line bg-paper px-6 py-4">
            <button className={btnSecondary} onClick={closeModal}>Cancel</button>
            <button className={btnDanger} onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete account"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
