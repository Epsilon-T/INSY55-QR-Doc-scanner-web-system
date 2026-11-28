import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import FilterPill from "../components/FilterPill.jsx";
import Modal from "../components/Modal.jsx";
import * as api from "../api.js";
import { courseColor } from "../colors.js";
import { useAuth } from "../auth.jsx";
import { ChevronIcon, Field, Select, inputClass, invalidClass } from "../components/FormControls.jsx";
import { IMAGE_ACCEPT, checkCourse, checkImage, checkName, checkStudentID, tidy } from "../validators.js";

const btnPrimary =
  "rounded-md bg-navy px-5 py-2.5 font-semibold text-white hover:bg-navy-dark disabled:opacity-60";
const btnSecondary = "rounded-md border border-line bg-white px-5 py-2.5 font-semibold hover:bg-paper";
const btnDanger = "rounded-md bg-bad px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60";
const btnSmall = "rounded-md border bg-white px-3 py-1.5 text-sm font-semibold";
const th = "bg-paper px-4 py-3 text-sm font-semibold text-muted";
// Cells of a student row. On phones the row is a small card, so the table cell padding only applies on wide screens.
const cell = "xl:border-b xl:border-line xl:px-4 xl:py-3.5";
// Small caption in front of a value on phones, taken from the cell's data-label
const inlineLabel = "before:mr-1.5 before:text-xs before:font-semibold before:text-muted before:content-[attr(data-label)] xl:before:hidden";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const NEW_COURSE = "__new__"; // the "add a new course" choice in the course dropdown

// Adds a student's saved value to a list of choices when it is not one of them (for example an older
// section like "3A"), so editing a student never silently changes it
const withCurrent = (options, current) => (current && !options.includes(current) ? [...options, current] : options);
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

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const courseOf = (s) => s.course.trim().toUpperCase();

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

// Marks the part of a name, number or section that matches what was typed in the search box
function Highlight({ text, query }) {
  const q = query.trim();
  const value = String(text ?? "");
  if (!q) return value;
  const parts = value.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-brass/25 px-0.5 text-inherit">{part}</mark>
    ) : (
      part
    )
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

function ImagePicker({ label, hint, preview, onPick, error, tall = false }) {
  return (
    <div className="grid content-start gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <label
        className={`flex ${tall ? "min-h-64" : "min-h-44"} cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center ${
          error ? "border-bad bg-bad/5" : "border-line bg-paper hover:border-navy focus-within:border-navy"
        }`}
      >
        <input
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={onPick}
          className="sr-only"
          aria-invalid={error ? "true" : undefined}
        />
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
      {error && <span className="text-xs text-bad" role="alert">{error}</span>}
    </div>
  );
}

function StudentForm({ student, courses, onSave, onCancel }) {
  const isEdit = Boolean(student);
  const originalSection = isEdit ? String(student.section) : "";
  const originalYear = isEdit ? normalizeYear(student.year) ?? student.year : "";
  const [fields, setFields] = useState(
    isEdit
      ? {
          studentID: student.studentID,
          name: student.name,
          course: student.course.trim().toUpperCase(),
          section: originalSection,
          year: originalYear,
        }
      : EMPTY
  );
  // true while a brand new course is being typed instead of picked from the list
  const [newCourse, setNewCourse] = useState(
    isEdit ? !courses.includes(student.course.trim().toUpperCase()) : courses.length === 0
  );
  const [cor, setCor] = useState({ file: null, preview: student?.imageUrl ?? null });
  const [photo, setPhoto] = useState({ file: null, preview: student?.photoUrl ?? null });
  const [errors, setErrors] = useState({}); // field name -> message
  const [formError, setFormError] = useState(""); // a problem reported by the server
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);

  // One check per field. Each returns a message, or "" when the value is fine.
  const check = {
    studentID: (v) => (isEdit ? "" : checkStudentID(v)),
    name: checkName,
    course: (v) => (newCourse ? checkCourse(v) : v ? "" : "Choose a course."),
    section: (v) => (v ? "" : "Choose a section."),
    year: (v) => (v ? "" : "Choose a year level."),
  };

  const touch = (key) => setErrors((e) => ({ ...e, [key]: check[key](fields[key]) }));
  const change = (key) => (e) => {
    const value = e.target.value;
    setFields((f) => ({ ...f, [key]: value }));
    // once a field shows an error, keep re-checking while the person fixes it
    if (errors[key]) setErrors((er) => ({ ...er, [key]: check[key](value) }));
  };
  const flag = (key) => (errors[key] ? invalidClass : "");
  const invalidProps = (key) => ({ "aria-invalid": errors[key] ? "true" : undefined });

  const focusFirstError = () =>
    requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());

  function pick(setter, key, what) {
    return (e) => {
      const chosen = e.target.files[0];
      if (!chosen) return;
      const problem = checkImage(chosen, what);
      setErrors((er) => ({ ...er, [key]: problem }));
      if (problem) return;
      setter({ file: chosen, preview: URL.createObjectURL(chosen) });
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    const found = {};
    for (const key of Object.keys(check)) {
      const problem = check[key](fields[key]);
      if (problem) found[key] = problem;
    }
    if (errors.image) found.image = errors.image;
    if (errors.photo) found.photo = errors.photo;
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError();
      return;
    }

    setBusy(true);
    try {
      await onSave({
        studentID: fields.studentID.trim(),
        name: tidy(fields.name),
        course: tidy(fields.course).toUpperCase(),
        section: fields.section,
        year: fields.year,
        image: cor.file,
        photo: photo.file,
      });
    } catch (err) {
      if (/already exists/i.test(err.message)) {
        setErrors({ studentID: err.message });
        focusFirstError();
      } else {
        setFormError(err.message);
      }
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit}>
      <div className="grid gap-6 p-6 md:grid-cols-2">
        {/* Left: student details */}
        <div className="grid content-start gap-4">
          <Field
            label="Student number"
            error={errors.studentID}
            hint={isEdit ? "The student number can't be changed." : "The student's QR code is created from this number."}
          >
            <input
              className={`${inputClass} ${flag("studentID")}`}
              value={fields.studentID}
              onChange={change("studentID")}
              onBlur={() => !isEdit && touch("studentID")}
              disabled={isEdit}
              maxLength={20}
              autoComplete="off"
              {...invalidProps("studentID")}
            />
          </Field>
          <Field label="Full name" error={errors.name}>
            <input
              className={`${inputClass} ${flag("name")}`}
              value={fields.name}
              onChange={change("name")}
              onBlur={() => touch("name")}
              maxLength={100}
              autoComplete="off"
              {...invalidProps("name")}
            />
          </Field>
          <Field label="Course" error={errors.course}>
            <Select
              value={newCourse ? NEW_COURSE : fields.course}
              invalid={Boolean(errors.course) && !newCourse}
              onChange={(e) => {
                const choice = e.target.value;
                setNewCourse(choice === NEW_COURSE);
                setFields((f) => ({ ...f, course: choice === NEW_COURSE ? "" : choice }));
                setErrors((er) => ({ ...er, course: "" }));
              }}
            >
              <option value="" disabled>Choose a course</option>
              {courses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value={NEW_COURSE}>+ Add a new course...</option>
            </Select>
            {newCourse && (
              <input
                className={`${inputClass} ${flag("course")}`}
                value={fields.course}
                onChange={change("course")}
                onBlur={() => touch("course")}
                placeholder="Type the new course, e.g. BSIT"
                maxLength={30}
                autoComplete="off"
                autoFocus
                {...invalidProps("course")}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Section" error={errors.section}>
              <Select value={fields.section} onChange={change("section")} invalid={Boolean(errors.section)}>
                <option value="" disabled>Select</option>
                {withCurrent(SECTIONS, originalSection).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
            </Field>
            <Field label="Year" error={errors.year}>
              <Select value={fields.year} onChange={change("year")} invalid={Boolean(errors.year)}>
                {withCurrent(YEARS, originalYear).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        {/* Right: face photo and COR */}
        <div className="grid content-start gap-4">
          <ImagePicker
            label="Face photo"
            hint="Clear, front-facing photo. JPG, PNG, WebP or GIF, up to 5 MB"
            preview={photo.preview}
            onPick={pick(setPhoto, "photo", "photo")}
            error={errors.photo}
          />
          <ImagePicker
            label="Certificate of Registration (COR)"
            hint="JPG, PNG, WebP or GIF, up to 5 MB"
            preview={cor.preview}
            onPick={pick(setCor, "image", "COR image")}
            error={errors.image}
            tall
          />
        </div>
      </div>

      {formError && (
        <p className="mx-6 mb-4 rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">
          {formError}
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
  const { user } = useAuth();
  const canEdit = user.staffRole === "Admin"; // Security Staff can look students up, but not change anything
  const [students, setStudents] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [modal, setModal] = useState(null); // { type: "add" | "edit" | "view" | "delete" | "qr", student? }
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState({}); // course -> true when folded
  const [note, setNote] = useState(null); // message above the list: { kind: "ok" | "bad", text }
  const searchRef = useRef(null);

  const refresh = useCallback(
    () => api.getStudents().then(setStudents).catch((e) => setLoadError(e.message)),
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

  // Every course in the system, sorted. The same list decides each course's color on the Dashboard.
  const courses = useMemo(() => [...new Set((students ?? []).map(courseOf))].sort(), [students]);

  // Search first, then the course filter. The numbers on the filter buttons follow the search.
  const matches = useMemo(() => {
    if (!students) return [];
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.studentID, s.name, s.course, s.section].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [students, query]);

  const shown = courseFilter === "all" ? matches : matches.filter((s) => courseOf(s) === courseFilter);

  // One group per course, and inside each course the students are grouped by year level
  const groups = useMemo(() => {
    const byCourse = new Map();
    for (const s of shown) {
      const key = courseOf(s);
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
  }, [shown]);

  const searching = query.trim() !== "";
  const narrowed = searching || courseFilter !== "all";
  const toggle = (course) => setCollapsed((c) => ({ ...c, [course]: !c[course] }));

  function clearFilters() {
    setQuery("");
    setCourseFilter("all");
  }

  async function handleSave(data) {
    if (modal.type === "edit") {
      await api.updateStudent(modal.student.studentID, data);
      setNote({ kind: "ok", text: `${data.name}'s record was updated.` });
    } else {
      await api.addStudent(data);
      setNote({ kind: "ok", text: `${data.name} was added.` });
    }
    await refresh();
    closeModal();
  }

  async function handleDelete() {
    const student = modal.student;
    setDeleting(true);
    try {
      await api.deleteStudent(student.studentID);
      setNote({ kind: "ok", text: `${student.name} was deleted.` });
      await refresh();
    } catch (err) {
      setNote({ kind: "bad", text: err.message });
    } finally {
      setDeleting(false);
      closeModal();
    }
  }

  if (loadError) return <p className="text-bad" role="alert">{loadError}</p>;
  if (!students) return <p className="text-muted">Loading students...</p>;

  return (
    <>
      <h1 className="sr-only">Student Information Management</h1>

      {/* Search and the add button */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto sm:min-w-72 sm:max-w-md sm:flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            ref={searchRef}
            type="text"
            autoComplete="off"
            className="w-full rounded-xl border border-line bg-white py-2.5 pl-11 pr-11 shadow-sm transition placeholder:text-muted/70 focus:border-navy focus:outline-none focus:ring-4 focus:ring-navy/15"
            placeholder="Search by number, name, course or section"
            aria-label="Search students"
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

        {canEdit && (
          <button className={`${btnPrimary} flex items-center gap-2 sm:ml-auto`} onClick={() => setModal({ type: "add" })}>
            <PlusIcon />
            Add student
          </button>
        )}
      </div>

      {/* One colored button per course, with its count */}
      {students.length > 0 && (
        <div role="group" aria-label="Filter by course" className="mb-5 flex flex-wrap gap-2">
          <FilterPill label="All" count={matches.length} active={courseFilter === "all"} onClick={() => setCourseFilter("all")} />
          {courses.map((c) => (
            <FilterPill
              key={c}
              label={c}
              count={matches.filter((s) => courseOf(s) === c).length}
              color={courseColor(c, courses)}
              active={courseFilter === c}
              onClick={() => setCourseFilter(c)}
            />
          ))}
        </div>
      )}

      {!canEdit && (
        <p className="mb-4 rounded-md border border-brass/30 bg-brass/10 px-3 py-2 text-sm">
          View only. You can look up students and open their COR and photo, but only an admin can change their records.
        </p>
      )}

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

      {searching && shown.length > 0 && (
        <p className="mb-4 text-sm text-muted">
          {shown.length} {shown.length === 1 ? "result" : "results"} for &ldquo;{query.trim()}&rdquo;
        </p>
      )}

      {students.length === 0 && (
        <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-line bg-white px-4 py-12 text-center">
          <p className="font-semibold">No students yet</p>
          <p className="text-sm text-muted">
            {canEdit ? "Add the first student to get started." : "No students have been registered yet."}
          </p>
        </div>
      )}
      {students.length > 0 && narrowed && shown.length === 0 && (
        <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-line bg-white px-4 py-12 text-center">
          <span className="text-muted"><SearchIcon /></span>
          <p className="font-semibold">No students found</p>
          <p className="text-sm text-muted">Try a different name or number, or another course.</p>
          <button className={`${btnSecondary} mt-2`} onClick={clearFilters}>Clear search and filters</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {groups.map((g) => {
          const open = searching || !collapsed[g.course];
          const color = courseColor(g.course, courses);
          const missing = g.years.reduce((n, y) => n + y.students.filter((s) => !s.imageUrl || !s.photoUrl).length, 0);
          return (
            <section key={g.course} aria-label={g.course}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(g.course)}
                className="mb-3 flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left"
              >
                <span className="size-2.5 rounded-full" style={{ background: color }} />
                <h2 className="text-lg font-bold">{g.course}</h2>
                {missing > 0 && (
                  <span className="rounded-full bg-bad/10 px-2 py-0.5 text-xs font-semibold text-bad">
                    {missing} missing COR or photo
                  </span>
                )}
                <span className="ml-auto text-muted"><ChevronIcon open={open} /></span>
              </button>

              {open && (
                <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
                  {/* Below very wide screens each student stacks into a small card; on wide screens it is a normal table */}
                  <table
                    className={`block w-full border-collapse text-left xl:table xl:table-fixed ${
                      canEdit ? "xl:min-w-[60rem]" : "xl:min-w-[46rem]"
                    }`}
                  >
                    <colgroup className="hidden xl:table-column-group">
                      <col className="w-40" />
                      <col />
                      <col className="w-24" />
                      <col className="w-36" />
                      <col className="w-32" />
                      {canEdit && <col className="w-56" />}
                    </colgroup>
                    <thead className="hidden xl:table-header-group">
                      <tr>
                        <th className={`${th} text-left`}>Student number</th>
                        <th className={`${th} text-left`}>Name</th>
                        {(canEdit ? ["Section", "COR", "Photo", "Actions"] : ["Section", "COR", "Photo"]).map((h) => (
                          <th key={h} className={`${th} text-center`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    {g.years.map((y) => (
                      <tbody key={y.year} className="block xl:table-row-group xl:[&:last-child>tr:last-child>td]:border-b-0">
                        <tr className="block xl:table-row">
                          <th colSpan={canEdit ? 6 : 5} scope="colgroup" className="block border-b border-line bg-navy/5 px-4 py-2 text-left text-sm font-semibold text-navy xl:table-cell">
                            {y.year}
                            <span className="ml-2 font-normal text-muted">{y.students.length}</span>
                          </th>
                        </tr>
                        {y.students.map((s) => (
                          <tr
                            key={s.studentID}
                            className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-line p-4 last:border-b-0 hover:bg-paper xl:table-row xl:gap-0 xl:border-b-0 xl:p-0"
                          >
                            <td className={`${cell} order-2 pl-12 text-sm tabular-nums text-muted xl:pl-4 xl:text-base xl:text-ink`}>
                              <Highlight text={s.studentID} query={query} />
                            </td>
                            <td className={`${cell} order-1 col-span-2`}>
                              <div className="flex min-w-0 items-center gap-3">
                                {s.photoUrl ? (
                                  <img src={s.photoUrl} alt="" className="size-9 shrink-0 rounded-full border border-line object-cover" />
                                ) : (
                                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy/10 text-sm font-bold text-navy">
                                    {initials(s.name)}
                                  </span>
                                )}
                                <span className="min-w-0 truncate font-medium" title={s.name}>
                                  <Highlight text={s.name} query={query} />
                                </span>
                              </div>
                            </td>
                            <td className={`${cell} order-3 text-sm text-muted xl:text-center xl:text-base xl:text-ink ${inlineLabel}`} data-label="Section">
                              <Highlight text={s.section} query={query} />
                            </td>
                            <td className={`${cell} order-4 pl-12 xl:pl-4 xl:text-center ${inlineLabel}`} data-label="COR">
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
                            <td className={`${cell} order-5 xl:text-center ${inlineLabel}`} data-label="Photo">
                              {s.photoUrl ? (
                                <button
                                  className="rounded-full bg-ok/10 px-3 py-1 text-sm font-semibold text-ok hover:bg-ok/20"
                                  onClick={() => setModal({ type: "view", student: s })}
                                >
                                  View photo
                                </button>
                              ) : (
                                <span className="rounded-full bg-bad/10 px-3 py-1 text-sm font-semibold text-bad">Missing</span>
                              )}
                            </td>
                            {canEdit && (
                            <td className={`${cell} order-6 col-span-2 pt-1 xl:pt-3.5`}>
                              <div className="flex justify-end gap-2 xl:justify-center">
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
                            )}
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
              {modal.student.imageUrl ? (
                <img src={modal.student.imageUrl} alt={`COR of ${modal.student.name}`} className="w-full rounded-md border border-line" />
              ) : (
                <p className="text-sm text-bad">No COR on file.</p>
              )}
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
