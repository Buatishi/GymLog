import { db } from "./db";
import type { BodyEntry, Exercise, RoutineDay, Variant } from "../lib/types";

export async function setWeight(date: string, exercise: Exercise, weightKg: number | null): Promise<void> {
  const logId = `${date}|${exercise.id}`;
  await db.transaction("rw", [db.logs, db.sessions], async () => {
    if (weightKg === null) {
      await db.logs.delete(logId);
      return;
    }
    await db.logs.put({ id: logId, date, exerciseId: exercise.id, dayId: exercise.dayId, weightKg });
    // Cargar un peso implica que ese día se entrenó.
    const sid = `${date}|${exercise.dayId}`;
    if (!(await db.sessions.get(sid))) await db.sessions.put({ id: sid, date, dayId: exercise.dayId, done: true });
  });
}

export async function setDayDone(date: string, dayId: string, done: boolean): Promise<void> {
  await db.sessions.put({ id: `${date}|${dayId}`, date, dayId, done });
}

export async function saveBody(date: string, patch: { weightKg?: number | null; measure?: { name: string; value: number | null } }): Promise<void> {
  await db.transaction("rw", db.body, async () => {
    const current: BodyEntry = (await db.body.get(date)) ?? { date, weightKg: null, measures: {} };
    const next: BodyEntry = { ...current, measures: { ...current.measures } };
    if (patch.weightKg !== undefined) next.weightKg = patch.weightKg;
    if (patch.measure) {
      if (patch.measure.value === null) delete next.measures[patch.measure.name];
      else next.measures[patch.measure.name] = patch.measure.value;
    }
    if (next.weightKg === null && Object.keys(next.measures).length === 0) await db.body.delete(date);
    else await db.body.put(next);
  });
}

export async function setVariantAnchor(anchor: string): Promise<void> {
  await db.settings.update("main", { variantAnchor: anchor });
}

export async function setMeasureNames(names: string[]): Promise<void> {
  await db.settings.update("main", { measureNames: names });
}

export async function addDay(name: string, slot: number, variant: Variant | null): Promise<string> {
  const id = crypto.randomUUID();
  const order = (await db.days.toArray()).reduce((m, d) => Math.max(m, d.order), -1) + 1;
  await db.days.add({ id, slot, name, variant, order, archived: false });
  return id;
}

export async function updateDay(id: string, patch: Partial<Pick<RoutineDay, "name" | "slot" | "variant" | "archived">>): Promise<void> {
  await db.days.update(id, patch);
}

export async function addExercise(dayId: string): Promise<string> {
  const id = crypto.randomUUID();
  const mine = await db.exercises.where("dayId").equals(dayId).toArray();
  const order = mine.reduce((m, e) => Math.max(m, e.order), -1) + 1;
  await db.exercises.add({ id, dayId, name: "", scheme: "", note: "", order, archived: false });
  return id;
}

export async function updateExercise(id: string, patch: Partial<Pick<Exercise, "name" | "scheme" | "note" | "archived">>): Promise<void> {
  await db.exercises.update(id, patch);
}

/** Intercambia la posición de dos ejercicios del mismo día. */
export async function swapExercises(a: Exercise, b: Exercise): Promise<void> {
  await db.transaction("rw", db.exercises, async () => {
    await db.exercises.update(a.id, { order: b.order });
    await db.exercises.update(b.id, { order: a.order });
  });
}

export async function swapDays(a: RoutineDay, b: RoutineDay): Promise<void> {
  await db.transaction("rw", db.days, async () => {
    await db.days.update(a.id, { order: b.order });
    await db.days.update(b.id, { order: a.order });
  });
}
