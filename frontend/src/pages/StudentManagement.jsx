import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import Modal from "../components/Modal.jsx";
import * as api from "../api.js";

const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2.5 disabled:bg-paper disabled:text-muted";
const btnPrimary =
  "rounded-md bg-navy px-5 py-2.5 font-semibold text-white hover:bg-navy-dark disabled:opacity-60";
const btnSecondary = "rounded-md border border-line bg-white px-5 py-2.5 font-semibold hover:bg-paper";
const btnDanger = "rounded-md bg-bad px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60";
const btnSmall = "rounded-md border bg-white px-3 py-1.5 text-sm font-semibold";
const th = "bg-paper px-4 py-3 text-sm font-semibold text-muted";
const td = "border-b border-line px-4 py-3.5";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
// Maps values like "2nd year", " 2nd Year " or "2" to one of YEARS, or null if it is something else
function normalizeYear(value) {
  const text = String(value ?? "").trim().toLowerCase();
  const exact = YEARS.find((y) => y.toLowerCase() === text);
  if (exact) return exact;
  const digit = text.match(/^([1-4])/);
  return digit ? YEARS[Number(digit[1]) - 1] : null;
}

const EMPTY = { studentID: "", name: "", course: "", section: "", year: YEARS[0] };

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/* ---------- Small pieces ---------- */

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-5-5-8 8" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
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

/* ---------- Pop-up window ---------- */

function QrView({ student, onClose }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    QRCode.toDataURL(student.hashedID, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#17202a", light: "#ffffff" },
    }).then(setSrc);
  }, [student.hashedID]);

  return (
    <>
      <div className="grid justify-items-center gap-2 p-6 text-center">
        {src ? (
          <img src={src} alt={`QR code of ${student.name}`} className="size-64 rounded-md border border-line" />
        ) : (
          <p className="grid size-64 place-items-center text-muted">Creating QR code...</p>
        )}
        <p className="mt-2 font-semibold">{student.name}</p>
        <p className="text-sm text-muted">
          {student.studentID} | {student.course} {student.section}
        </p>
      </div>
      <div className="flex justify-end gap-3 border-t border-line bg-paper px-6 py-4">
        <button className={btnSecondary} onClick={onClose}>Close</button>
        {src && (
          <a className={btnPrimary} href={src} download={`${student.studentID}-qr.png`}>
            Download QR
          </a>
        )}
      </div>
    </>
  );
}

function ImagePicker({ label, hint, preview, onPick, tall = false }) {
  return (
    <div className="grid content-start gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <label
        className={`flex ${tall ? "min-h-64" : "min-h-44"} cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-paper p-4 text-center hover:border-navy focus-within:border-navy`}
      >
        <input type="file" accept="image/*" onChange={onPick} className="sr-only" />
        {preview ? (
          <>
            <img
              src={preview}
              alt={`${label} preview`}
              className={`${tall ? "max-h-56" : "max-h-36"} rounded border border-line bg-white object-contain`}
            />
            <span className="text-sm font-semibold text-navy">Replace image</span>
          </>
        ) : (
          <>
            <span className="text-muted"><ImageIcon /></span>
            <span className="font-semibold text-navy">Choose image</span>
            <span className="text-xs text-muted">{hint}</span>
          </>
        )}
      </label>
    </div>
  );
}

function StudentForm({ student, courses, onSave, onCancel }) {
  const isEdit = Boolean(student);
  const [fields, setFields] = useState(
    isEdit
      ? { studentID: student.studentID, name: student.name, course: student.course, section: student.section, year: student.year }
      : EMPTY
  );
  const [cor, setCor] = useState({ file: null, preview: student?.imageUrl ?? null });
  const [photo, setPhoto] = useState({ file: null, preview: student?.photoUrl ?? null });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  function pick(setter, what) {
    return (e) => {
      const chosen = e.target.files[0];
      if (!chosen) return;
      if (!chosen.type.startsWith("image/")) {
        setError(`The ${what} must be an image file (JPG or PNG).`);
        return;
      }
      if (chosen.size > 5 * 1024 * 1024) {
        setError(`The ${what} must be 5 MB or smaller.`);
        return;
      }
      setError("");
      setter({ file: chosen, preview: URL.createObjectURL(chosen) });
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSave({ ...fields, course: fields.course.trim().toUpperCase(), image: cor.file, photo: photo.file });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 p-6 md:grid-cols-2">
        {/* Left: student details */}
        <div className="grid content-start gap-4">
          <Field
            label="Student number"
            hint={isEdit ? "The student number can't be changed." : "The student's QR code is created from this number."}
          >
            <input className={inputClass} value={fields.studentID} onChange={set("studentID")} disabled={isEdit} required />
          </Field>
          <Field label="Full name">
            <input className={inputClass} value={fields.name} onChange={set("name")} required />
          </Field>
          <Field label="Course">
            <input className={inputClass} value={fields.course} onChange={set("course")} placeholder="e.g. BSIT" list="course-options" required />
            <datalist id="course-options">
              {courses.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Section">
              <input className={inputClass} value={fields.section} onChange={set("section")} placeholder="e.g. 3A" required />
            </Field>
            <Field label="Year">
              <select className={inputClass} value={fields.year} onChange={set("year")}>
                {YEARS.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Right: face photo and COR */}
        <div className="grid content-start gap-4">
          <ImagePicker
            label="Face photo"
            hint="Clear, front-facing photo. JPG or PNG, up to 5 MB"
            preview={photo.preview}
            onPick={pick(setPhoto, "photo")}
          />
          <ImagePicker
            label="Certificate of Registration (COR)"
            hint="JPG or PNG, up to 5 MB"
            preview={cor.preview}
            onPick={pick(setCor, "COR image")}
            tall
          />
        </div>
      </div>

      {error && (
        <p className="mx-6 mb-4 rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-line bg-paper px-6 py-4">
        <button type="button" className={btnSecondary} onClick={onCancel}>Cancel</button>
        <button className={btnPrimary} disabled={busy}>
          {busy ? "Saving..." : isEdit ? "Save changes" : "Add student"}
        </button>
      </div>
    </form>
  );
}

/* ---------- Page ---------- */

export default function StudentManagement() {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // { type: "add" | "edit" | "view" | "delete", student? }
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState({}); // course -> true when folded

  const refresh = useCallback(
    () => api.getStudents().then(setStudents).catch((e) => setError(e.message)),
    []
  );
  useEffect(() => {
    refresh();
  }, [refresh]);

  const closeModal = useCallback(() => setModal(null), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!students) return [];
    if (!q) return students;
    return students.filter((s) =>
      [s.studentID, s.name, s.course, s.section].some((v) => v.toLowerCase().includes(q))
    );
  }, [students, query]);

  const courses = useMemo(
    () => [...new Set((students ?? []).map((s) => s.course.trim().toUpperCase()))].sort(),
    [students]
  );

  // One group per course, and inside each course the students are grouped by year level
  const groups = useMemo(() => {
    const byCourse = new Map();
    for (const s of visible) {
      const key = s.course.trim().toUpperCase();
      if (!byCourse.has(key)) byCourse.set(key, []);
      byCourse.get(key).push(s);
    }
    const order = (a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name);
    return [...byCourse.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([course, list]) => {
        const years = YEARS.map((year) => ({ year, students: list.filter((s) => normalizeYear(s.year) === year).sort(order) }));
        const other = list.filter((s) => normalizeYear(s.year) === null).sort(order);
        if (other.length) years.push({ year: "Other", students: other });
        return { course, total: list.length, years: years.filter((y) => y.students.length > 0) };
      });
  }, [visible]);

  const searching = query.trim() !== "";
  const toggle = (course) => setCollapsed((c) => ({ ...c, [course]: !c[course] }));

  async function handleSave(data) {
    if (modal.type === "edit") await api.updateStudent(modal.student.studentID, data);
    else await api.addStudent(data);
    await refresh();
    closeModal();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteStudent(modal.student.studentID);
      await refresh();
      closeModal();
    } catch (err) {
      setError(err.message);
      closeModal();
    } finally {
      setDeleting(false);
    }
  }

  if (error) return <p className="text-bad" role="alert">{error}</p>;
  if (!students) return <p className="text-muted">Loading students...</p>;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Student Information Management</h1>
          <p className="text-muted">Add students, update their details and keep every COR on file.</p>
        </div>
        <button className={btnPrimary} onClick={() => setModal({ type: "add" })}>Add student</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            className="w-full rounded-md border border-line bg-white py-2.5 pl-10 pr-3"
            type="search"
            placeholder="Search by number, name, course or section"
            aria-label="Search students"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="text-sm text-muted">Showing {visible.length} of {students.length} students</p>
      </div>

      {students.length === 0 && (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center text-muted">
          No students yet. Add the first student.
        </p>
      )}
      {students.length > 0 && groups.length === 0 && (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center text-muted">
          No students match your search.
        </p>
      )}

      <div className="grid gap-5">
        {groups.map((g) => {
          const open = searching || !collapsed[g.course];
          const missing = g.years.reduce((n, y) => n + y.students.filter((s) => !s.imageUrl || !s.photoUrl).length, 0);
          return (
            <section key={g.course} className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(g.course)}
                className="flex w-full items-center justify-between gap-4 bg-navy px-5 py-3.5 text-left text-white"
              >
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-head text-xl font-bold">{g.course}</span>
                  <span className="text-sm text-slate-300">
                    {g.total} {g.total === 1 ? "student" : "students"}
                  </span>
                  {missing > 0 && <span className="text-sm text-amber-300">{missing} missing COR or photo</span>}
                </span>
                <ChevronIcon open={open} />
              </button>

              {open && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[60rem] table-fixed border-collapse text-left">
                    <colgroup>
                      <col className="w-40" />
                      <col />
                      <col className="w-24" />
                      <col className="w-36" />
                      <col className="w-32" />
                      <col className="w-56" />
                    </colgroup>
                    <thead>
                      <tr>
                        {["Student number", "Name", "Section", "COR", "Photo"].map((h) => (
                          <th key={h} className={th}>{h}</th>
                        ))}
                        <th className={`${th} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    {g.years.map((y) => (
                      <tbody key={y.year}>
                        <tr>
                          <th colSpan={6} scope="colgroup" className="border-b border-line bg-navy/5 px-4 py-2 text-left text-sm font-semibold text-navy">
                            {y.year}
                            <span className="ml-2 font-normal text-muted">{y.students.length}</span>
                          </th>
                        </tr>
                        {y.students.map((s) => (
                          <tr key={s.studentID} className="hover:bg-paper">
                            <td className={`${td} tabular-nums`}>{s.studentID}</td>
                            <td className={td}>
                              <div className="flex min-w-0 items-center gap-3">
                                {s.photoUrl ? (
                                  <img src={s.photoUrl} alt="" className="size-9 shrink-0 rounded-full border border-line object-cover" />
                                ) : (
                                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy/10 text-sm font-bold text-navy">
                                    {initials(s.name)}
                                  </span>
                                )}
                                <span className="min-w-0 truncate font-medium" title={s.name}>{s.name}</span>
                              </div>
                            </td>
                            <td className={td}>{s.section}</td>
                            <td className={td}>
                              {s.imageUrl ? (
                                <button
                                  className="rounded-full bg-ok/10 px-3 py-1 text-sm font-semibold text-ok hover:bg-ok/20"
                                  onClick={() => setModal({ type: "view", student: s })}
                                >
                                  View COR
                                </button>
                              ) : (
                                <span className="rounded-full bg-bad/10 px-3 py-1 text-sm font-semibold text-bad">Missing</span>
                              )}
                            </td>
                            <td className={td}>
                              {s.photoUrl ? (
                                <span className="rounded-full bg-ok/10 px-3 py-1 text-sm font-semibold text-ok">On file</span>
                              ) : (
                                <span className="rounded-full bg-bad/10 px-3 py-1 text-sm font-semibold text-bad">Missing</span>
                              )}
                            </td>
                            <td className={td}>
                              <div className="flex justify-end gap-2">
                                <button className={`${btnSmall} border-line text-navy hover:bg-paper`} onClick={() => setModal({ type: "qr", student: s })}>
                                  QR
                                </button>
                                <button className={`${btnSmall} border-line text-navy hover:bg-paper`} onClick={() => setModal({ type: "edit", student: s })}>
                                  Edit
                                </button>
                                <button className={`${btnSmall} border-bad/30 text-bad hover:bg-bad/10`} onClick={() => setModal({ type: "delete", student: s })}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {(modal?.type === "add" || modal?.type === "edit") && (
        <Modal
          title={modal.type === "add" ? "Add student" : "Edit student"}
          subtitle={
            modal.type === "add"
              ? "Enter the student's details and upload their COR."
              : `${modal.student.name} (${modal.student.studentID})`
          }
          size="max-w-3xl"
          onClose={closeModal}
        >
          <StudentForm student={modal.student} courses={courses} onSave={handleSave} onCancel={closeModal} />
        </Modal>
      )}

      {modal?.type === "qr" && (
        <Modal title="Student QR code" subtitle="Print this on the student's ID." size="max-w-sm" onClose={closeModal}>
          <QrView student={modal.student} onClose={closeModal} />
        </Modal>
      )}

      {modal?.type === "view" && (
        <Modal
          title={`COR and photo of ${modal.student.name}`}
          subtitle={`${modal.student.studentID} | ${modal.student.course} ${modal.student.section}`}
          size="max-w-3xl"
          onClose={closeModal}
        >
          <div className="grid gap-4 p-6 md:grid-cols-[10rem_1fr]">
            <div>
              <p className="mb-1.5 text-sm font-medium">Face photo</p>
              {modal.student.photoUrl ? (
                <img src={modal.student.photoUrl} alt={`Photo of ${modal.student.name}`} className="aspect-[3/4] w-full rounded-md border border-line object-cover" />
              ) : (
                <p className="text-sm text-bad">No photo on file.</p>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">COR</p>
              <img src={modal.student.imageUrl} alt={`COR of ${modal.student.name}`} className="w-full rounded-md border border-line" />
            </div>
          </div>
          <div className="flex justify-end border-t border-line bg-paper px-6 py-4">
            <button className={btnSecondary} onClick={closeModal}>Close</button>
          </div>
        </Modal>
      )}

      {modal?.type === "delete" && (
        <Modal title="Delete student" size="max-w-md" onClose={closeModal}>
          <p className="p-6">
            Delete <strong>{modal.student.name}</strong> ({modal.student.studentID}) and their COR image? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 border-t border-line bg-paper px-6 py-4">
            <button className={btnSecondary} onClick={closeModal}>Cancel</button>
            <button className={btnDanger} onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete student"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
