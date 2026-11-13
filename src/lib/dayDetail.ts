import type { BodyEntry, Exercise, RoutineDay, Session, WeightLog } from "./types";

export interface DayDetailData {
  days: RoutineDay[];
  exercises: Exercise[];
  sessions: Session[];
  logs: WeightLog[];
  body: BodyEntry[];
}

export interface DayDetailBlock {
  day: RoutineDay;
  lifts: { name: string; scheme: string; weightKg: number }[];
  /** Ejercicios del día sin peso cargado en esa fecha. */
  pending: number;
}

export interface DayDetail {
  date: string;
  blocks: DayDetailBlock[];
  body: BodyEntry | null;
}

/** Todo lo registrado en una fecha: días entrenados con sus pesos, y el peso corporal y medidas. */
export function buildDayDetail(date: string, data: DayDetailData): DayDetail {
  const dayLogs = data.logs.filter((l) => l.date === date);
  const dayIds = new Set<string>([...data.sessions.filter((s) => s.date === date && s.done).map((s) => s.dayId), ...dayLogs.map((l) => l.dayId)]);

  const blocks = data.days
    .filter((d) => dayIds.has(d.id))
    .sort((a, b) => a.order - b.order)
    .map((day): DayDetailBlock => {
      const exercises = data.exercises.filter((e) => e.dayId === day.id).sort((a, b) => a.order - b.order);
      const lifts: DayDetailBlock["lifts"] = [];
      let pending = 0;
      for (const e of exercises) {
        const log = dayLogs.find((l) => l.exerciseId === e.id);
        if (log) lifts.push({ name: e.name, scheme: e.scheme, weightKg: log.weightKg });
        else if (!e.archived) pending++;
      }
      return { day, lifts, pending };
    });

  return { date, blocks, body: data.body.find((b) => b.date === date) ?? null };
}
