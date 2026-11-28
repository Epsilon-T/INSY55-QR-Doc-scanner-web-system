// Rules for the text typed into the forms. The backend checks the same rules again,
// because a check in the browser can always be bypassed.
// Every check returns an error message, or "" when the value is fine.

export const NAME_PATTERN = /^\p{L}(?:[\p{L}\p{M}]|[ .'’\-,])*$/u;
export const STUDENT_ID_PATTERN = /^[A-Za-z0-9-]{5,20}$/;
export const COURSE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &.-]{1,29}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

// Trims the ends and turns runs of spaces into a single space
export const tidy = (text) => text.trim().replace(/\s+/g, " ");

export function checkStudentID(value) {
  const text = value.trim();
  if (!text) return "Enter the student number.";
  if (/\s/.test(text)) return "The student number can't contain spaces.";
  if (!STUDENT_ID_PATTERN.test(text)) return "Use 5 to 20 letters, numbers or hyphens.";
  return "";
}

export function checkName(value) {
  const text = tidy(value);
  if (!text) return "Enter the full name.";
  if (text.length < 2) return "The name is too short.";
  if (text.length > 100) return "The name must be 100 characters or fewer.";
  if (!NAME_PATTERN.test(text)) return "Use letters, spaces, periods, commas, hyphens and apostrophes only.";
  return "";
}

export function checkCourse(value) {
  const text = tidy(value);
  if (!text) return "Enter the course name.";
  if (!COURSE_PATTERN.test(text)) return "Use 2 to 30 letters, numbers, spaces, & . or -";
  return "";
}

export function checkEmail(value) {
  const text = value.trim();
  if (!text) return "Enter the email address.";
  if (text.length > 150) return "The email must be 150 characters or fewer.";
  if (!EMAIL_PATTERN.test(text)) return "Enter a valid email address, like name@school.edu.";
  return "";
}

export function checkPassword(value) {
  if (!value) return "Enter a password.";
  if (value.length < MIN_PASSWORD) return `The password must be at least ${MIN_PASSWORD} characters.`;
  if (value.length > 100) return "The password must be 100 characters or fewer.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Include at least one letter and one number.";
  return "";
}

export function checkConfirm(password, confirm) {
  if (!confirm) return "Type the password again.";
  if (confirm !== password) return "The two passwords do not match.";
  return "";
}

export function checkImage(file, label) {
  if (file.size === 0) return `The ${label} file is empty.`;
  if (!IMAGE_TYPES.includes(file.type)) return `The ${label} must be a JPG, PNG, WebP or GIF image.`;
  if (file.size > MAX_IMAGE_BYTES) return `The ${label} must be 5 MB or smaller.`;
  return "";
}
