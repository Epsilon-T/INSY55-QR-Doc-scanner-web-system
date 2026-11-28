// Turns rows into a CSV file and downloads it. Excel opens it directly.
// A cell that starts with = + - or @ gets a leading apostrophe, so a spreadsheet never runs it as a formula.
const cell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(","));
  // the leading \ufeff makes Excel read accents and other special letters correctly
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
