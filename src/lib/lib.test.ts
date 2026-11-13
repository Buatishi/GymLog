import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatLong, formatRange, formatSpan, weekdayIndex, weekEnd, weekStart, weeksBetween } from "./dates";
import { activeVariant, anchorFor, daysForWeek, siblingOf } from "./variants";
import { buildRangeReport, buildWeekReport, type WeekData } from "./weekly";
import { parseBackup } from "./backup";
import type { Exercise, RoutineDay } from "./types";

describe("fechas", () => {
  it("la semana va de lunes a domingo", () => {
    expect(weekStart("2026-11-12")).toBe("2026-11-09"); // jueves
    expect(weekStart("2026-11-09")).toBe("2026-11-09"); // lunes
    expect(weekStart("2026-11-15")).toBe("2026-11-09"); // domingo
    expect(weekEnd("2026-11-09")).toBe("2026-11-15");
  });
  it("suma días cruzando mes y año", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("no se rompe con el cambio de horario", () => {
    expect(weeksBetween("2026-03-23", "2026-03-30")).toBe(1);
    expect(weeksBetween("2026-10-19", "2026-11-09")).toBe(3);
  });
  it("formatea el rango", () => {
    expect(formatRange("2026-11-09")).toBe("9 nov – 15 nov");
    expect(formatSpan("2026-11-11", "2026-11-18")).toBe("11 nov – 18 nov");
  });
  it("cuenta días entre fechas y da el día de la semana", () => {
    expect(daysBetween("2026-11-09", "2026-11-15")).toBe(6);
    expect(daysBetween("2026-11-15", "2026-11-09")).toBe(-6);
    expect(weekdayIndex("2026-11-09")).toBe(0); // lunes
    expect(weekdayIndex("2026-11-15")).toBe(6); // domingo
    expect(formatLong("2026-11-12")).toBe("jueves 12 de noviembre");
  });
});

const day = (id: string, slot: number, variant: RoutineDay["variant"], order: number): RoutineDay => ({ id, slot, name: id, variant, order, archived: false });

describe("alternancia del día 4", () => {
  const anchor = "2026-11-09";
  it("alterna A y B semana por medio, también hacia atrás", () => {
    expect(activeVariant("2026-11-12", anchor)).toBe("A");
    expect(activeVariant("2026-11-16", anchor)).toBe("B");
    expect(activeVariant("2026-11-23", anchor)).toBe("A");
    expect(activeVariant("2026-11-02", anchor)).toBe("B");
    expect(activeVariant("2026-10-26", anchor)).toBe("A");
  });
  it("anchorFor deja activa la variante pedida", () => {
    for (const want of ["A", "B"] as const) {
      expect(activeVariant("2026-11-12", anchorFor("2026-11-12", want))).toBe(want);
    }
  });
  it("ofrece los días fijos y solo la variante activa", () => {
    const days = [day("d1", 1, null, 0), day("d4a", 4, "A", 3), day("d4b", 4, "B", 4)];
    expect(daysForWeek(days, "2026-11-12", anchor).map((d) => d.id)).toEqual(["d1", "d4a"]);
    expect(daysForWeek(days, "2026-11-17", anchor).map((d) => d.id)).toEqual(["d1", "d4b"]);
  });
  it("encuentra la variante hermana", () => {
    const days = [day("d1", 1, null, 0), day("d4a", 4, "A", 3), day("d4b", 4, "B", 4)];
    expect(siblingOf(days, days[1] as RoutineDay)?.id).toBe("d4b");
    expect(siblingOf(days, days[0] as RoutineDay)).toBeUndefined();
  });
});

const ex = (id: string, dayId: string, order: number, archived = false): Exercise => ({ id, dayId, name: id, scheme: "8-10 x 3", note: "", order, archived });

function data(): WeekData {
  return {
    days: [day("d1", 1, null, 0), day("d4a", 4, "A", 3), day("d4b", 4, "B", 4)],
    exercises: [ex("remo", "d1", 0), ex("jalon", "d1", 1), ex("sentadilla", "d4a", 0), ex("press", "d4b", 0), ex("viejo", "d1", 2, true)],
    sessions: [],
    logs: [],
    body: [],
    measureNames: ["Cintura"],
  };
}

describe("reporte semanal", () => {
  it("toma el máximo de la semana sin importar el día", () => {
    const d = data();
    d.logs = [
      { id: "1", date: "2026-11-09", exerciseId: "remo", dayId: "d1", weightKg: 8 },
      { id: "2", date: "2026-11-13", exerciseId: "remo", dayId: "d1", weightKg: 10 },
      { id: "3", date: "2026-11-11", exerciseId: "remo", dayId: "d1", weightKg: 9 },
    ];
    const r = buildWeekReport("2026-11-09", d);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0]?.rows.find((x) => x.exercise.id === "remo")?.max).toBe(10);
  });

  it("ignora lo que cae fuera de lunes a domingo", () => {
    const d = data();
    d.logs = [
      { id: "1", date: "2026-11-08", exerciseId: "remo", dayId: "d1", weightKg: 50 },
      { id: "2", date: "2026-11-16", exerciseId: "remo", dayId: "d1", weightKg: 60 },
      { id: "3", date: "2026-11-15", exerciseId: "remo", dayId: "d1", weightKg: 12 },
    ];
    const row = buildWeekReport("2026-11-09", d).blocks[0]?.rows[0];
    expect(row?.max).toBe(12);
    expect(row?.previous).toBe(50);
    expect(row?.delta).toBe(-38);
  });

  it("compara con la última semana que tuvo dato (la pierna aparece cada 15 días)", () => {
    const d = data();
    d.logs = [
      { id: "1", date: "2026-10-26", exerciseId: "sentadilla", dayId: "d4a", weightKg: 80 },
      { id: "2", date: "2026-10-28", exerciseId: "sentadilla", dayId: "d4a", weightKg: 85 },
      { id: "3", date: "2026-11-09", exerciseId: "sentadilla", dayId: "d4a", weightKg: 90 },
    ];
    const row = buildWeekReport("2026-11-09", d).blocks[0]?.rows[0];
    expect(row?.previous).toBe(85);
    expect(row?.delta).toBe(5);
  });

  it("no incluye días sin actividad, pero sí un día marcado como hecho sin pesos", () => {
    const d = data();
    d.sessions = [{ id: "2026-11-10|d1", date: "2026-11-10", dayId: "d1", done: true }];
    const r = buildWeekReport("2026-11-09", d);
    expect(r.blocks.map((b) => b.day.id)).toEqual(["d1"]);
    expect(r.trainedDays).toBe(1);
    expect(r.blocks[0]?.rows.every((x) => x.max === null)).toBe(true);
    expect(r.blocks[0]?.rows.map((x) => x.exercise.id)).not.toContain("viejo");
  });

  it("un ejercicio archivado aparece si tiene peso esa semana", () => {
    const d = data();
    d.logs = [{ id: "1", date: "2026-11-10", exerciseId: "viejo", dayId: "d1", weightKg: 20 }];
    expect(buildWeekReport("2026-11-09", d).blocks[0]?.rows.map((x) => x.exercise.id)).toContain("viejo");
  });

  it("promedia el peso corporal y lo compara con la semana anterior", () => {
    const d = data();
    d.body = [
      { date: "2026-11-02", weightKg: 86, measures: {} },
      { date: "2026-11-04", weightKg: 85, measures: {} },
      { date: "2026-11-09", weightKg: 85, measures: {} },
      { date: "2026-11-11", weightKg: 84, measures: {} },
      { date: "2026-11-13", weightKg: 83.5, measures: {} },
    ];
    const r = buildWeekReport("2026-11-09", d);
    expect(r.avgWeight).toBe(84.17);
    expect(r.previousAvgWeight).toBe(85.5);
    expect(r.weightDelta).toBe(-1.33);
    expect(r.weights).toHaveLength(3);
  });

  it("sin datos de peso corporal devuelve nulos y no NaN", () => {
    const r = buildWeekReport("2026-11-09", data());
    expect(r.avgWeight).toBeNull();
    expect(r.weightDelta).toBeNull();
    expect(r.measures[0]).toEqual({ name: "Cintura", value: null, previous: null, delta: null });
  });

  it("la medida usa el último valor de la semana y el anterior más reciente", () => {
    const d = data();
    d.body = [
      { date: "2026-10-12", weightKg: null, measures: { Cintura: 95 } },
      { date: "2026-10-26", weightKg: null, measures: { Cintura: 94 } },
      { date: "2026-11-10", weightKg: null, measures: { Cintura: 93 } },
      { date: "2026-11-14", weightKg: null, measures: { Cintura: 92.5 } },
    ];
    const m = buildWeekReport("2026-11-09", d).measures[0];
    expect(m).toEqual({ name: "Cintura", value: 92.5, previous: 94, delta: -1.5 });
  });
});

describe("reporte de un rango libre", () => {
  it("de miércoles a miércoles toma el máximo del rango y compara con la ventana anterior", () => {
    const d = data();
    d.logs = [
      { id: "a", date: "2026-11-05", exerciseId: "remo", dayId: "d1", weightKg: 28 }, // ventana anterior (3 al 10 nov)
      { id: "b", date: "2026-11-12", exerciseId: "remo", dayId: "d1", weightKg: 30 },
      { id: "c", date: "2026-11-17", exerciseId: "remo", dayId: "d1", weightKg: 35 },
      { id: "x", date: "2026-11-19", exerciseId: "remo", dayId: "d1", weightKg: 99 }, // fuera del rango
    ];
    const row = buildRangeReport("2026-11-11", "2026-11-18", d).blocks[0]?.rows[0];
    expect(row?.max).toBe(35);
    expect(row?.previous).toBe(28);
    expect(row?.delta).toBe(7);
  });

  it("cuenta fechas entrenadas distintas, no días de rutina", () => {
    const d = data();
    d.sessions = [
      { id: "1", date: "2026-11-10", dayId: "d1", done: true },
      { id: "2", date: "2026-11-10", dayId: "d4a", done: true },
      { id: "3", date: "2026-11-12", dayId: "d1", done: true },
      { id: "4", date: "2026-11-13", dayId: "d1", done: false },
    ];
    expect(buildRangeReport("2026-11-09", "2026-11-15", d).trainedDays).toBe(2);
  });

  it("promedia el peso contra una ventana del mismo largo", () => {
    const d = data();
    d.body = [
      { date: "2026-11-02", weightKg: 88, measures: {} },
      { date: "2026-11-05", weightKg: 86, measures: {} }, // ventana anterior de 14 días: 26 oct al 8 nov
      { date: "2026-11-12", weightKg: 85, measures: {} },
      { date: "2026-11-20", weightKg: 83, measures: {} },
    ];
    const r = buildRangeReport("2026-11-09", "2026-11-22", d);
    expect(r.avgWeight).toBe(84);
    expect(r.previousAvgWeight).toBe(87);
    expect(r.weightDelta).toBe(-3);
  });
});

describe("validación de backup", () => {
  const valid = {
    app: "gymlog",
    version: 1,
    exportedAt: "2026-11-12T00:00:00.000Z",
    days: [{ id: "d1", slot: 1, name: "Espalda", variant: null, order: 0, archived: false }],
    exercises: [{ id: "e1", dayId: "d1", name: "Remo", scheme: "8-10 x 4", note: "", order: 0, archived: false }],
    sessions: [{ id: "2026-11-09|d1", date: "2026-11-09", dayId: "d1", done: true }],
    logs: [{ id: "2026-11-09|e1", date: "2026-11-09", exerciseId: "e1", dayId: "d1", weightKg: 40 }],
    body: [{ date: "2026-11-09", weightKg: 85, measures: { Cintura: 92 } }],
    settings: { key: "main", measureNames: ["Cintura"], variantAnchor: "2026-11-09" },
  };

  it("acepta un backup correcto", () => {
    expect(parseBackup(JSON.stringify(valid)).logs).toHaveLength(1);
  });
  it("rechaza lo que no es JSON, lo que no es de GymLog y registros rotos", () => {
    expect(() => parseBackup("no es json")).toThrow(/JSON/);
    expect(() => parseBackup(JSON.stringify({ app: "otra" }))).toThrow(/GymLog/);
    expect(() => parseBackup(JSON.stringify({ ...valid, version: 2 }))).toThrow(/Versión/);
    expect(() => parseBackup(JSON.stringify({ ...valid, logs: [{ ...valid.logs[0], weightKg: "40" }] }))).toThrow(/logs/);
    expect(() => parseBackup(JSON.stringify({ ...valid, body: [{ date: "ayer", weightKg: 1, measures: {} }] }))).toThrow(/body/);
    expect(() => parseBackup(JSON.stringify({ ...valid, settings: undefined }))).toThrow(/settings/);
    expect(() => parseBackup(JSON.stringify({ ...valid, days: undefined }))).toThrow(/days/);
  });
});
