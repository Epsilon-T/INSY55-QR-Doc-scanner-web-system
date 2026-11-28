// Colors shared by the Dashboard charts and the Student page,
// so a course keeps the same color everywhere it appears.
export const PALETTE = ["#1b3a5c", "#b8892b", "#2e7d4f", "#5b8bb5", "#c76b4a", "#7a6fa8", "#4aa3a2", "#8d99a6"];

const FALLBACK = "#8d99a6";

// `courses` is the sorted list of every course in the system, so each course always gets the same color
export function courseColor(course, courses) {
  const index = courses.indexOf(course);
  return index === -1 ? FALLBACK : PALETTE[index % PALETTE.length];
}
