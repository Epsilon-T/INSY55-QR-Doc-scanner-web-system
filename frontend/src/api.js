// All backend calls live here. With VITE_USE_MOCK=true the app runs without FastAPI.
// Empty means "same address as the website". The Vite proxy in vite.config.js forwards /api to FastAPI.
const BASE = import.meta.env.VITE_API_URL ?? "";
const MOCK = import.meta.env.VITE_USE_MOCK == "false";

const MOCK_ACCOUNTS = [
  { staffID: 1, staffName: "Admin User", schoolEmail: "admin@sua.edu", password: "admin123", staffRole: "Admin" },
  { staffID: 2, staffName: "Security Guard", schoolEmail: "security@sua.edu", password: "guard123", staffRole: "Security" },
];

function getToken() {
  try {
    return JSON.parse(localStorage.getItem("sua_session"))?.token ?? null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      // The browser sets the multipart Content-Type itself for FormData
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401 && token) {
    // the login expired: clear it and go back to the login page
    localStorage.removeItem("sua_session");
    window.location.assign("/login");
    throw new Error("Your session expired. Please log in again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Please check the details and try again.");
  }
  return res.json();
}

// Image links from the backend are relative (/api/students/...), so add the base address
const withBase = (url) => (url ? BASE + url : null);

// POST /api/auth/login  ->  { token, user: { staffID, staffName, staffRole } }
export async function login(email, password) {
  if (MOCK) {
    const match = MOCK_ACCOUNTS.find((a) => a.schoolEmail === email && a.password === password);
    if (!match) throw new Error("Email or password is incorrect.");
    const user = {
      staffID: match.staffID,
      staffName: match.staffName,
      schoolEmail: match.schoolEmail,
      staffRole: match.staffRole,
    };
    return { token: "mock-token", user };
  }
  return request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

// GET /api/logs?days=7  ->  [{ date: "2026-11-09", studentEntered: 10, studentDenied: 2 }]
export async function getDailyLogs(days = 7) {
  if (MOCK) {
    const entered = [412, 438, 395, 450, 421, 0, 187];
    const denied = [9, 14, 7, 12, 10, 0, 3];
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const isToday = i === days - 1;
      return {
        date: d.toISOString().slice(0, 10),
        studentEntered: isToday ? mockToday.entered : entered[i % entered.length],
        studentDenied: isToday ? mockToday.denied : denied[i % denied.length],
      };
    });
  }
  return request(`/api/logs?days=${days}`);
}

/* ---------- Students ---------- */

// Stand-ins for what the backend does: hashedID is really the encrypted student number.
const mockHash = (studentID) => "SUA-" + btoa(studentID).replace(/=/g, "");

// A placeholder COR image, drawn as an SVG, so the scanner has something to show.
function mockCor(s) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
<rect width="600" height="800" fill="#fff" stroke="#1b3a5c" stroke-width="6"/>
<text x="300" y="90" font-family="sans-serif" font-size="30" font-weight="bold" text-anchor="middle" fill="#1b3a5c">School University Academy</text>
<text x="300" y="140" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#5b6770">Certificate of Registration</text>
<line x1="60" y1="170" x2="540" y2="170" stroke="#d9dfdc" stroke-width="2"/>
<text x="60" y="240" font-family="sans-serif" font-size="22" fill="#17202a">Name: ${s.name}</text>
<text x="60" y="290" font-family="sans-serif" font-size="22" fill="#17202a">Student number: ${s.studentID}</text>
<text x="60" y="340" font-family="sans-serif" font-size="22" fill="#17202a">Course: ${s.course}   Section: ${s.section}</text>
<text x="60" y="390" font-family="sans-serif" font-size="22" fill="#17202a">Year level: ${s.year}</text>
<text x="300" y="720" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#2e7d4f">Officially enrolled</text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// A placeholder face photo, drawn as an SVG, so the scanner has one to show.
function mockPhoto(s) {
  const letters = s.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
<rect width="300" height="400" fill="#d9dfdc"/>
<circle cx="150" cy="150" r="70" fill="#5b6770"/>
<path d="M40 400c0-80 50-120 110-120s110 40 110 120z" fill="#5b6770"/>
<text x="150" y="168" font-family="sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#fff">${letters}</text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// Today's counts, changed by mock scans so the Dashboard reacts.
const mockToday = { entered: 187, denied: 3 };

// In mock mode the list lives in memory, so it resets when the page is refreshed.
// noCor / noPhoto: true leaves that image out, so you can test a denied scan.
let mockStudents = [
  { studentID: "2023-00101", name: "Juan Dela Cruz", course: "BSIT", section: "3A", year: "3rd Year" },
  { studentID: "2023-00104", name: "Carlo Mendoza", course: "BSIT", section: "3A", year: "3rd Year" },
  { studentID: "2024-00215", name: "Paolo Reyes", course: "BSIT", section: "1A", year: "1st Year" },
  { studentID: "2022-00130", name: "Rhea Villanueva", course: "BSIT", section: "4B", year: "4th Year" },
  { studentID: "2023-00102", name: "Maria Santos", course: "BSCS", section: "2B", year: "2nd Year" },
  { studentID: "2023-00118", name: "Kenneth Ramos", course: "BSCS", section: "2A", year: "2nd Year", noPhoto: true },
  { studentID: "2024-00240", name: "Bianca Cruz", course: "BSBA", section: "1C", year: "1st Year", noCor: true },
  { studentID: "2022-00087", name: "Angela Bautista", course: "BSED", section: "4A", year: "4th Year", noCor: true },
].map(({ noCor, noPhoto, ...s }) => ({
  ...s,
  hashedID: mockHash(s.studentID),
  imageUrl: noCor ? null : mockCor(s),
  photoUrl: noPhoto ? null : mockPhoto(s),
}));

function toFormData(data) {
  const fd = new FormData();
  ["studentID", "name", "course", "section", "year"].forEach((k) => fd.append(k, data[k]));
  if (data.image) fd.append("image", data.image);
  if (data.photo) fd.append("photo", data.photo);
  return fd;
}

// GET /api/students  ->  [{ studentID, name, course, section, year, hashedID, imageUrl, photoUrl }]
// hashedID is the encrypted student number, the value stored inside the student's QR code
// imageUrl (COR) and photoUrl (face photo) are null when that image has not been uploaded yet
export async function getStudents() {
  if (MOCK) return mockStudents.map((s) => ({ ...s }));
  const list = await request("/api/students");
  return list.map((s) => ({ ...s, imageUrl: withBase(s.imageUrl), photoUrl: withBase(s.photoUrl) }));
}

// POST /api/students (multipart form: studentID, name, course, section, year, image)
// The backend encrypts the student number into hashedID.
export async function addStudent(data) {
  if (MOCK) {
    if (mockStudents.some((s) => s.studentID === data.studentID)) {
      throw new Error("A student with this number already exists.");
    }
    const { image, photo, ...fields } = data;
    mockStudents = [
      ...mockStudents,
      {
        ...fields,
        hashedID: mockHash(fields.studentID),
        imageUrl: image ? URL.createObjectURL(image) : null,
        photoUrl: photo ? URL.createObjectURL(photo) : null,
      },
    ];
    return { ok: true };
  }
  return request("/api/students", { method: "POST", body: toFormData(data) });
}

// PUT /api/students/{studentID} (multipart form; image is optional, omit to keep the current one)
export async function updateStudent(studentID, data) {
  if (MOCK) {
    mockStudents = mockStudents.map((s) => {
      if (s.studentID !== studentID) return s;
      const { image, photo, ...fields } = data;
      return {
        ...s,
        ...fields,
        imageUrl: image ? URL.createObjectURL(image) : s.imageUrl,
        photoUrl: photo ? URL.createObjectURL(photo) : s.photoUrl,
      };
    });
    return { ok: true };
  }
  return request(`/api/students/${encodeURIComponent(studentID)}`, { method: "PUT", body: toFormData(data) });
}

// DELETE /api/students/{studentID}
export async function deleteStudent(studentID) {
  if (MOCK) {
    mockStudents = mockStudents.filter((s) => s.studentID !== studentID);
    return { ok: true };
  }
  return request(`/api/students/${encodeURIComponent(studentID)}`, { method: "DELETE" });
}

/* ---------- Scanner ---------- */

// POST /api/scan { code }  ->  { status: "entered" | "denied", reason?, student? }
// The backend looks the code up by hashedID and adds 1 to today's row in the logs table.
// "entered" = student found, with both a COR and a face photo on file. "denied" = anything else.
export async function verifyScan(code) {
  if (MOCK) {
    const student = mockStudents.find((s) => s.hashedID === code);
    if (!student) {
      mockToday.denied += 1;
      return { status: "denied", reason: "This QR code is not recognized.", student: null };
    }
    if (!student.imageUrl) {
      mockToday.denied += 1;
      return { status: "denied", reason: "No COR is on file for this student.", student: { ...student } };
    }
    if (!student.photoUrl) {
      mockToday.denied += 1;
      return { status: "denied", reason: "No face photo is on file for this student.", student: { ...student } };
    }
    mockEntries.push({ studentID: student.studentID, daysAgo: 0 });
    mockToday.entered += 1;
    return { status: "entered", student: { ...student } };
  }
  const res = await request("/api/scan", { method: "POST", body: JSON.stringify({ code }) });
  if (!res.student) return res;
  return {
    ...res,
    student: { ...res.student, imageUrl: withBase(res.student.imageUrl), photoUrl: withBase(res.student.photoUrl) },
  };
}

/* ---------- Staff ---------- */

// GET /api/staff  ->  [{ staffID, staffName, schoolEmail, staffRole }]
export async function getStaff() {
  if (MOCK) {
    return MOCK_ACCOUNTS.map((a) => ({
      staffID: a.staffID,
      staffName: a.staffName,
      schoolEmail: a.schoolEmail,
      staffRole: a.staffRole,
    }));
  }
  return request("/api/staff");
}

// POST /api/staff  { staffName, schoolEmail, staffRole, password }
export async function addStaff(data) {
  if (MOCK) {
    if (MOCK_ACCOUNTS.some((a) => a.schoolEmail === data.schoolEmail)) {
      throw new Error("A staff account with this email already exists.");
    }
    const nextID = Math.max(0, ...MOCK_ACCOUNTS.map((a) => a.staffID)) + 1;
    MOCK_ACCOUNTS.push({ staffID: nextID, ...data });
    return { ok: true };
  }
  return request("/api/staff", { method: "POST", body: JSON.stringify(data) });
}

// PUT /api/staff/{staffID}  { staffName, schoolEmail, staffRole, password? }
// Leave password out to keep the current one.
export async function updateStaff(staffID, data) {
  if (MOCK) {
    if (MOCK_ACCOUNTS.some((a) => a.schoolEmail === data.schoolEmail && a.staffID !== staffID)) {
      throw new Error("A staff account with this email already exists.");
    }
    const account = MOCK_ACCOUNTS.find((a) => a.staffID === staffID);
    if (!account) throw new Error("Staff account not found.");
    account.staffName = data.staffName;
    account.schoolEmail = data.schoolEmail;
    account.staffRole = data.staffRole;
    if (data.password) account.password = data.password;
    return { ok: true };
  }
  return request(`/api/staff/${staffID}`, { method: "PUT", body: JSON.stringify(data) });
}

// DELETE /api/staff/{staffID}  (you cannot delete your own account)
export async function deleteStaff(staffID) {
  if (MOCK) {
    const me = JSON.parse(localStorage.getItem("sua_session") || "null")?.user?.staffID;
    if (staffID === me) throw new Error("You can't delete your own account.");
    const index = MOCK_ACCOUNTS.findIndex((a) => a.staffID === staffID);
    if (index === -1) throw new Error("Staff account not found.");
    MOCK_ACCOUNTS.splice(index, 1);
    return { ok: true };
  }
  return request(`/api/staff/${staffID}`, { method: "DELETE" });
}

/* ---------- Dashboard statistics ---------- */

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

function normalizeYearValue(value) {
  const text = String(value ?? "").trim().toLowerCase();
  const exact = YEAR_LEVELS.find((y) => y.toLowerCase() === text);
  if (exact) return exact;
  const digit = text.match(/^([1-4])/);
  return digit ? YEAR_LEVELS[Number(digit[1]) - 1] : "Other";
}

// Mock mode only: pretend most students entered on one of the last few days.
// Scanning in mock mode adds to this list too.
const mockEntries = mockStudents
  .filter((s) => s.imageUrl && s.photoUrl)
  .map((s, i) => ({ studentID: s.studentID, daysAgo: i % 5 }));

function summarizeEntries(people) {
  const byCourse = new Map();
  const byYear = new Map();
  const matrix = new Map();
  for (const { course, year } of people) {
    byCourse.set(course, (byCourse.get(course) ?? 0) + 1);
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
    const row = matrix.get(course) ?? {};
    row[year] = (row[year] ?? 0) + 1;
    matrix.set(course, row);
  }
  const yearColumns = byYear.has("Other") ? [...YEAR_LEVELS, "Other"] : YEAR_LEVELS;
  const rows = [...matrix.entries()].map(([course, years]) => ({
    course,
    years,
    total: Object.values(years).reduce((a, b) => a + b, 0),
  }));
  return {
    total: people.length,
    yearColumns,
    byCourse: [...byCourse.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    byYear: yearColumns.filter((y) => byYear.has(y)).map((label) => ({ label, count: byYear.get(label) })),
    matrix: rows.sort((a, b) => b.total - a.total || a.course.localeCompare(b.course)),
  };
}

// GET /api/stats/entries?period=today|7d|30d
//   ->  { total, yearColumns, byCourse: [{label, count}], byYear: [{label, count}],
//         matrix: [{ course, total, years: { "1st Year": 3, ... } }] }
// Every student is counted once, however many times they scanned in the period.
export async function getEntryStats(period = "today") {
  if (MOCK) {
    const days = { today: 1, "7d": 7, "30d": 30 }[period] ?? 1;
    const people = new Map();
    for (const e of mockEntries) {
      if (e.daysAgo >= days) continue;
      const student = mockStudents.find((s) => s.studentID === e.studentID);
      if (student) {
        people.set(student.studentID, {
          course: student.course.trim().toUpperCase(),
          year: normalizeYearValue(student.year),
        });
      }
    }
    return summarizeEntries([...people.values()]);
  }
  return request(`/api/stats/entries?period=${encodeURIComponent(period)}`);
}
