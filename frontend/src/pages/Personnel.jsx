import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FilterPill from "../components/FilterPill.jsx";
import Modal from "../components/Modal.jsx";
import * as api from "../api.js";
import { useAuth } from "../auth.jsx";
import { PALETTE } from "../colors.js";
import { Field, Select, inputClass, invalidClass } from "../components/FormControls.jsx";
import { checkConfirm, checkEmail, checkName, checkPassword } from "../validators.js";

const btnPrimary =
  "rounded-md bg-navy px-5 py-2.5 font-semibold text-white hover:bg-navy-dark disabled:opacity-60";
const btnSecondary = "rounded-md border border-line bg-white px-5 py-2.5 font-semibold hover:bg-paper";
const btnDanger = "rounded-md bg-bad px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60";
const btnSmall = "rounded-md border bg-white px-3 py-1.5 text-sm font-semibold";

const th = "bg-paper px-4 py-3 text-sm font-semibold text-muted";

const EMPTY = { staffName: "", schoolEmail: "", staffRole: "Security", password: "", confirm: "" };

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const roleLabel = (role) => (role === "Security" ? "Security Staff" : "Admin");

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The two groups shown on the page, in this order
const GROUPS = [
  {
    role: "Admin",
    title: "Admins",
    about: "Can manage students and personnel",
    empty: "No admins yet.",
    dot: "bg-brass",
    avatar: "bg-linear-to-br from-brass to-[#d9a93f]",
  },
  {
    role: "Security",
    title: "Security Staff",
    about: "Can scan student IDs at the gate",
    empty: "No security staff yet.",
    dot: "bg-navy",
    avatar: "bg-linear-to-br from-navy to-navy-dark",
  },
];

const FILTERS = [
  { value: "all", label: "All" },
  { value: "Admin", label: "Admins", color: PALETTE[1] }, // brass, like the Admins group
  { value: "Security", label: "Security staff", color: PALETTE[0] }, // navy, like the Security Staff group
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// Marks the part of a name or email that matches what was typed in the search box
function Highlight({ text, query }) {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-brass/25 px-0.5 text-inherit">{part}</mark>
    ) : (
      part
    )
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
  const [errors, setErrors] = useState({}); // field name -> message
  const [formError, setFormError] = useState(""); // a problem reported by the server
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);

  // New accounts need a password. When editing, a blank password keeps the current one.
  const wantsPassword = !isEdit || fields.password !== "";
  const passwordType = showPassword ? "text" : "password";

  // One check per field. Each returns a message, or "" when the value is fine.
  const check = {
    staffName: checkName,
    schoolEmail: checkEmail,
    staffRole: (v) => (v ? "" : "Choose a role."),
    password: (v) => (wantsPassword ? checkPassword(v) : ""),
    confirm: (v) => (wantsPassword ? checkConfirm(fields.password, v) : ""),
  };

  const touch = (key) => setErrors((e) => ({ ...e, [key]: check[key](fields[key]) }));
  const change = (key) => (e) => {
    const value = e.target.value;
    setFields((f) => ({ ...f, [key]: value }));
    // once a field shows an error, keep re-checking while the person fixes it
    if (errors[key]) setErrors((er) => ({ ...er, [key]: check[key](value) }));
    // changing the password also changes whether the confirmation still matches
    if (key === "password" && fields.confirm) {
      setErrors((er) => ({ ...er, confirm: checkConfirm(value, fields.confirm) }));
    }
  };
  const flag = (key) => (errors[key] ? invalidClass : "");
  const invalidProps = (key) => ({ "aria-invalid": errors[key] ? "true" : undefined });

  const focusFirstError = () =>
    requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    const found = {};
    for (const key of Object.keys(check)) {
      const problem = check[key](fields[key]);
      if (problem) found[key] = problem;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError();
      return;
    }

    const data = {
      staffName: fields.staffName.trim().replace(/\s+/g, " "),
      schoolEmail: fields.schoolEmail.trim().toLowerCase(),
      staffRole: fields.staffRole,
    };
    if (wantsPassword) data.password = fields.password;

    setBusy(true);
    try {
      await onSave(data);
    } catch (err) {
      if (/already exists/i.test(err.message)) {
        setErrors({ schoolEmail: err.message });
        focusFirstError();
      } else {
        setFormError(err.message);
      }
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 p-6">
        <Field label="Full name" error={errors.staffName}>
          <input
            className={`${inputClass} ${flag("staffName")}`}
            value={fields.staffName}
            onChange={change("staffName")}
            onBlur={() => touch("staffName")}
            maxLength={100}
            autoComplete="off"
            {...invalidProps("staffName")}
          />
        </Field>
        <Field label="School email" error={errors.schoolEmail} hint="They use this to log in.">
          <input
            type="email"
            className={`${inputClass} ${flag("schoolEmail")}`}
            value={fields.schoolEmail}
            onChange={change("schoolEmail")}
            onBlur={() => touch("schoolEmail")}
            maxLength={150}
            autoComplete="off"
            {...invalidProps("schoolEmail")}
          />
        </Field>
        <Field label="Role" error={errors.staffRole}>
          <Select value={fields.staffRole} onChange={change("staffRole")} invalid={Boolean(errors.staffRole)}>
            <option value="Security">Security Staff (guard)</option>
            <option value="Admin">Admin</option>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={isEdit ? "New password" : "Password"}
            error={errors.password}
            hint={
              isEdit
                ? "Leave blank to keep the current one."
                : "At least 8 characters, with a letter and a number."
            }
          >
            <input
              type={passwordType}
              className={`${inputClass} ${flag("password")}`}
              value={fields.password}
              onChange={change("password")}
              onBlur={() => touch("password")}
              maxLength={100}
              autoComplete="new-password"
              {...invalidProps("password")}
            />
          </Field>
          <Field label="Confirm password" error={errors.confirm}>
            <input
              type={passwordType}
              className={`${inputClass} ${flag("confirm")}`}
              value={fields.confirm}
              onChange={change("confirm")}
              onBlur={() => touch("confirm")}
              maxLength={100}
              autoComplete="new-password"
              {...invalidProps("confirm")}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
          Show password
        </label>
      </div>

      {formError && (
        <p className="mx-6 mb-4 rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">
          {formError}
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
  const [roleFilter, setRoleFilter] = useState("all");
  const [modal, setModal] = useState(null); // { type: "add" | "edit" | "delete", account? }
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState(null); // message above the list: { kind: "ok" | "bad", text }
  const searchRef = useRef(null);

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

  // Press "/" anywhere on the page to jump to the search box
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  // Search first, then the role filter. The numbers on the filter buttons follow the search.
  const matches = useMemo(() => {
    if (!staff) return [];
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => [s.staffName, s.schoolEmail].some((v) => v.toLowerCase().includes(q)));
  }, [staff, query]);

  const counts = {
    all: matches.length,
    Admin: matches.filter((s) => s.staffRole === "Admin").length,
    Security: matches.filter((s) => s.staffRole === "Security").length,
  };
  const shown = roleFilter === "all" ? matches : matches.filter((s) => s.staffRole === roleFilter);
  const narrowed = query.trim() !== "" || roleFilter !== "all";

  function clearFilters() {
    setQuery("");
    setRoleFilter("all");
  }

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

  const sections = GROUPS.map((g) => ({ ...g, list: shown.filter((s) => s.staffRole === g.role) }));

  return (
    <>
      <h1 className="sr-only">Personnel Registration</h1>

      {/* Search, role filter and the register button */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto sm:min-w-72 sm:flex-1 sm:max-w-md">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            ref={searchRef}
            type="text"
            autoComplete="off"
            className="w-full rounded-xl border border-line bg-white py-2.5 pl-11 pr-11 shadow-sm transition placeholder:text-muted/70 focus:border-navy focus:outline-none focus:ring-4 focus:ring-navy/15"
            placeholder="Search by name or email"
            aria-label="Search personnel"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink"
            >
              <CloseIcon />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-paper px-1.5 text-xs text-muted sm:block">
              /
            </kbd>
          )}
        </div>

        <button className={`${btnPrimary} flex items-center gap-2 sm:ml-auto`} onClick={() => setModal({ type: "add" })}>
          <PlusIcon />
          Register personnel
        </button>
      </div>

      {/* One colored button per role, with its count */}
      <div role="group" aria-label="Filter by role" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <FilterPill
            key={f.value}
            label={f.label}
            count={counts[f.value]}
            color={f.color}
            active={roleFilter === f.value}
            onClick={() => setRoleFilter(f.value)}
          />
        ))}
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

      {query.trim() !== "" && shown.length > 0 && (
        <p className="mb-4 text-sm text-muted">
          {shown.length} {shown.length === 1 ? "result" : "results"} for &ldquo;{query.trim()}&rdquo;
        </p>
      )}

      {narrowed && shown.length === 0 && (
        <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-line bg-white px-4 py-12 text-center">
          <span className="text-muted"><SearchIcon /></span>
          <p className="font-semibold">No personnel found</p>
          <p className="text-sm text-muted">Try a different name or email, or another role.</p>
          <button className={`${btnSecondary} mt-2`} onClick={clearFilters}>Clear search and filters</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {sections.map((g) => {
          if (g.list.length === 0 && narrowed) return null;
          return (
            <section key={g.role} aria-label={g.title}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <span className={`size-2.5 self-center rounded-full ${g.dot}`} />
                <h2 className="text-lg font-bold">{g.title}</h2>
                <span className="text-sm text-muted">{g.about}</span>
              </div>

              {g.list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-white px-5 py-8 text-center text-muted">{g.empty}</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
                  {/* On phones each row stacks into a small card; from large screens up it is a normal table */}
                  <table className="block w-full border-collapse text-left lg:table lg:min-w-[40rem] lg:table-fixed">
                    <colgroup className="hidden lg:table-column-group">
                      <col className="w-1/3" />
                      <col />
                      <col className="w-44" />
                    </colgroup>
                    <thead className="hidden lg:table-header-group">
                      <tr>
                        <th className={th}>Name</th>
                        <th className={th}>Email</th>
                        <th className={`${th} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="block lg:table-row-group lg:[&>tr:last-child>td]:border-b-0">
                      {g.list.map((s) => {
                        const isMe = s.staffID === user.staffID;
                        return (
                          <tr
                            key={s.staffID}
                            className="block border-b border-line p-4 last:border-b-0 hover:bg-paper lg:table-row lg:border-b-0 lg:p-0"
                          >
                            <td className="block lg:table-cell lg:border-b lg:border-line lg:px-4 lg:py-3.5">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-sm ${g.avatar}`}>
                                  {initials(s.staffName)}
                                </span>
                                <span className="min-w-0 truncate font-medium" title={s.staffName}>
                                  <Highlight text={s.staffName} query={query} />
                                </span>
                                {isMe && (
                                  <span className="shrink-0 rounded-full bg-ok/10 px-2 py-0.5 text-xs font-semibold text-ok">You</span>
                                )}
                              </div>
                            </td>
                            <td className="block pl-12 pt-0.5 text-sm text-muted lg:table-cell lg:border-b lg:border-line lg:px-4 lg:py-3.5 lg:text-base lg:text-ink">
                              <span className="block truncate" title={s.schoolEmail}>
                                <Highlight text={s.schoolEmail} query={query} />
                              </span>
                            </td>
                            <td className="block pt-3 lg:table-cell lg:border-b lg:border-line lg:px-4 lg:py-3.5">
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
                                  disabled={isMe}
                                  title={isMe ? "You can't delete your own account" : undefined}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
