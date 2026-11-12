import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { BodyEntry, Exercise, RoutineDay, Session, Settings, WeightLog } from "../lib/types";

export interface AppData {
  days: RoutineDay[];
  exercises: Exercise[];
  sessions: Session[];
  logs: WeightLog[];
  body: BodyEntry[];
  settings: Settings;
}

/** Todo el contenido de la base, reactivo. Son pocos datos (un año de uso son ~1000 filas). */
export function useData(): AppData | undefined {
  return useLiveQuery(async () => {
    const [days, exercises, sessions, logs, body, settings] = await Promise.all([
      db.days.toArray(),
      db.exercises.toArray(),
      db.sessions.toArray(),
      db.logs.toArray(),
      db.body.toArray(),
      db.settings.get("main"),
    ]);
    if (!settings) return undefined;
    return { days, exercises, sessions, logs, body, settings };
  }, []);
}
