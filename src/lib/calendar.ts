import { addDays, weekEnd, weekStart } from "./dates";
import type { BodyEntry, RoutineDay, Session, WeightLog } from "./types";

export interface CellSession {
  dayId: string;
  slot: number;
  name: string;
}

/** Un día del calendario: qué se entrenó y si hay datos cargados. */
export interface CalendarCell {
  date: string;
  dayNumber: number;
  sessions: CellSession[];
  logged: number; // cantidad de pesos cargados ese día
  hasBody: boolean;
  isFuture: boolean;
  isToday: boolean;
}

export interface CalendarWeek {
  start: string;
  cells: CalendarCell[];
  trained: number; // fechas con entrenamiento
}

export interface CalendarData {
  days: RoutineDay[];
  sessions: Session[];
  logs: WeightLog[];
  body: BodyEntry[];
}

/** Colores distintos por número de día; el día 4 comparte color entre sus dos variantes. */
export const PALETTE_SIZE = 6;
export const slotColorIndex = (slot: number) => ((Math.max(slot, 1) - 1) % PALETTE_SIZE) + 1;

/** Lunes de las últimas `count` semanas, la más nueva primero. */
export function recentWeekStarts(today: string, count: number): string[] {
  const current = weekStart(today);
  return Array.from({ length: count }, (_, i) => addDays(current, -7 * i));
}

export function buildCalendar(starts: string[], data: CalendarData, today: string): CalendarWeek[] {
  const dayById = new Map(data.days.map((d) => [d.id, d]));
  const doneByDate = new Map<string, CellSession[]>();
  for (const s of data.sessions) {
    if (!s.done) continue;
    const day = dayById.get(s.dayId);
    if (!day) continue;
    const list = doneByDate.get(s.date) ?? [];
    list.push({ dayId: day.id, slot: day.slot, name: day.name });
    doneByDate.set(s.date, list);
  }
  const loggedByDate = new Map<string, number>();
  for (const l of data.logs) loggedByDate.set(l.date, (loggedByDate.get(l.date) ?? 0) + 1);
  const bodyDates = new Set(data.body.map((b) => b.date));

  return starts.map((start) => {
    const cells: CalendarCell[] = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        date,
        dayNumber: Number(date.slice(8)),
        sessions: doneByDate.get(date) ?? [],
        logged: loggedByDate.get(date) ?? 0,
        hasBody: bodyDates.has(date),
        isFuture: date > today,
        isToday: date === today,
      };
    });
    return { start, cells, trained: cells.filter((c) => c.sessions.length > 0).length };
  });
}

/** Las 7 fechas de la semana que contiene `date`. */
export function weekCells(date: string, data: CalendarData, today: string): CalendarCell[] {
  return (buildCalendar([weekStart(date)], data, today)[0] as CalendarWeek).cells;
}

export interface Selection {
  from: string;
  to: string;
}

const isSingleWeek = (s: Selection) => s.to === weekEnd(s.from) && weekStart(s.from) === s.from;

/**
 * Elegir semanas con toques: el primero marca una semana; uno en otra semana arma el rango
 * entre ambas; con un rango ya armado, el toque vuelve a empezar desde esa semana.
 */
export function selectWeek(current: Selection, tappedMonday: string): Selection {
  if (isSingleWeek(current) && current.from !== tappedMonday) {
    const first = current.from < tappedMonday ? current.from : tappedMonday;
    const last = current.from < tappedMonday ? tappedMonday : current.from;
    return { from: first, to: weekEnd(last) };
  }
  return { from: tappedMonday, to: weekEnd(tappedMonday) };
}

/** Lunes de cada semana incluida en la selección, de la más vieja a la más nueva. */
export function weeksIn(sel: Selection): string[] {
  const out: string[] = [];
  for (let w = weekStart(sel.from); w <= sel.to; w = addDays(w, 7)) out.push(w);
  return out;
}
