export type Variant = "A" | "B";

/** Un día de la rutina. Los días con la misma `slot` y `variant` se alternan semana por medio. */
export interface RoutineDay {
  id: string;
  slot: number; // número de día que se muestra ("Día 4")
  name: string;
  variant: Variant | null;
  order: number;
  archived: boolean;
}

export interface Exercise {
  id: string;
  dayId: string;
  name: string;
  scheme: string; // texto libre: "8-10 x 4"
  note: string;
  order: number;
  archived: boolean;
}

/** Que exista y esté `done` significa "ese día lo entrené en esa fecha". */
export interface Session {
  id: string; // `${date}|${dayId}`
  date: string; // YYYY-MM-DD
  dayId: string;
  done: boolean;
}

export interface WeightLog {
  id: string; // `${date}|${exerciseId}`
  date: string;
  exerciseId: string;
  dayId: string;
  weightKg: number;
}

export interface BodyEntry {
  date: string; // clave
  weightKg: number | null;
  measures: Record<string, number>; // { Cintura: 92 }
}

export interface Settings {
  key: "main";
  measureNames: string[];
  /** Un lunes en el que el día alternado es la variante A. */
  variantAnchor: string;
}

export interface BackupFile {
  app: "gymlog";
  version: 1;
  exportedAt: string;
  days: RoutineDay[];
  exercises: Exercise[];
  sessions: Session[];
  logs: WeightLog[];
  body: BodyEntry[];
  settings: Settings;
}
