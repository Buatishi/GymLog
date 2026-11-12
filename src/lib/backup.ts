import type { BackupFile } from "./types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isDate = (v: unknown): v is string => isStr(v) && ISO.test(v);

function list(v: unknown, name: string, check: (x: Record<string, unknown>) => boolean): void {
  if (!Array.isArray(v)) throw new Error(`Backup inválido: falta la lista "${name}"`);
  v.forEach((x, i) => {
    if (!isObj(x) || !check(x)) throw new Error(`Backup inválido: "${name}" tiene un registro roto (posición ${i + 1})`);
  });
}

/** Valida un backup JSON antes de reemplazar los datos. Lanza Error con un mensaje legible si algo no cierra. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es un JSON válido");
  }
  if (!isObj(raw) || raw.app !== "gymlog") throw new Error("Este archivo no es un backup de GymLog");
  if (raw.version !== 1) throw new Error("Versión de backup no soportada");

  list(raw.days, "days", (d) => isStr(d.id) && isNum(d.slot) && isStr(d.name) && isNum(d.order) && (d.variant === null || d.variant === "A" || d.variant === "B") && typeof d.archived === "boolean");
  list(raw.exercises, "exercises", (e) => isStr(e.id) && isStr(e.dayId) && isStr(e.name) && isStr(e.scheme) && isStr(e.note) && isNum(e.order) && typeof e.archived === "boolean");
  list(raw.sessions, "sessions", (s) => isStr(s.id) && isDate(s.date) && isStr(s.dayId) && typeof s.done === "boolean");
  list(raw.logs, "logs", (l) => isStr(l.id) && isDate(l.date) && isStr(l.exerciseId) && isStr(l.dayId) && isNum(l.weightKg));
  list(raw.body, "body", (b) => isDate(b.date) && (b.weightKg === null || isNum(b.weightKg)) && isObj(b.measures) && Object.values(b.measures).every(isNum));

  const s = raw.settings;
  if (!isObj(s) || s.key !== "main" || !Array.isArray(s.measureNames) || !s.measureNames.every(isStr) || !isDate(s.variantAnchor)) {
    throw new Error('Backup inválido: falta "settings"');
  }
  return raw as unknown as BackupFile;
}
