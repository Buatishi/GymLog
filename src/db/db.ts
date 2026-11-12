import Dexie, { type Table } from "dexie";
import { weekStart, todayISO } from "../lib/dates";
import { parseBackup } from "../lib/backup";
import type { BackupFile, BodyEntry, Exercise, RoutineDay, Session, Settings, WeightLog } from "../lib/types";
import { buildSeed } from "./seed";

export class GymDB extends Dexie {
  days!: Table<RoutineDay, string>;
  exercises!: Table<Exercise, string>;
  sessions!: Table<Session, string>;
  logs!: Table<WeightLog, string>;
  body!: Table<BodyEntry, string>;
  settings!: Table<Settings, string>;

  constructor(name = "gymlog") {
    super(name);
    this.version(1).stores({
      days: "id, order",
      exercises: "id, dayId, order",
      sessions: "id, date, dayId",
      logs: "id, date, exerciseId",
      body: "date",
      settings: "key",
    });
  }
}

export const db = new GymDB();

/** Primera apertura: carga la rutina del PDF y los ajustes por defecto. No pisa nada existente. */
export async function ensureSeed(d: GymDB = db): Promise<void> {
  await d.transaction("rw", [d.days, d.exercises, d.settings], async () => {
    if ((await d.days.count()) === 0) {
      const seed = buildSeed();
      await d.days.bulkAdd(seed.days);
      await d.exercises.bulkAdd(seed.exercises);
    }
    if (!(await d.settings.get("main"))) {
      await d.settings.add({ key: "main", measureNames: ["Cintura"], variantAnchor: weekStart(todayISO()) });
    }
  });
}

export async function exportBackup(d: GymDB = db): Promise<BackupFile> {
  const settings = await d.settings.get("main");
  if (!settings) throw new Error("No hay datos para exportar");
  return {
    app: "gymlog",
    version: 1,
    exportedAt: new Date().toISOString(),
    days: await d.days.toArray(),
    exercises: await d.exercises.toArray(),
    sessions: await d.sessions.toArray(),
    logs: await d.logs.toArray(),
    body: await d.body.toArray(),
    settings,
  };
}

/** Reemplaza todo por el contenido del backup. Valida primero: si falla, no toca nada. */
export async function importBackup(text: string, d: GymDB = db): Promise<void> {
  const b = parseBackup(text);
  await d.transaction("rw", [d.days, d.exercises, d.sessions, d.logs, d.body, d.settings], async () => {
    await Promise.all([d.days.clear(), d.exercises.clear(), d.sessions.clear(), d.logs.clear(), d.body.clear(), d.settings.clear()]);
    await d.days.bulkAdd(b.days);
    await d.exercises.bulkAdd(b.exercises);
    await d.sessions.bulkAdd(b.sessions);
    await d.logs.bulkAdd(b.logs);
    await d.body.bulkAdd(b.body);
    await d.settings.add(b.settings);
  });
}
