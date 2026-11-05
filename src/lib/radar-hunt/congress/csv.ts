// RADAR HUNT — exportación CSV para la organización (Excel en español: «;» y BOM UTF-8).

export type Cell = string | number | boolean | null | undefined;

export function csvCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "boolean" ? (v ? "sí" : "no") : String(v);
  if (typeof v === "number") s = String(v).replace(".", ",");
  // Evita la inyección de fórmulas al abrir en una hoja de cálculo.
  if (/^[=+\-@\t\r]/.test(s) && typeof v !== "number") s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
