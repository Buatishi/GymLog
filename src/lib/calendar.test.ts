import { describe, expect, it } from "vitest";
import { buildCalendar, recentWeekStarts, selectWeek, slotColorIndex, weekCells, weeksIn } from "./calendar";
import type { RoutineDay } from "./types";

const day = (id: string, slot: number, name: string): RoutineDay => ({ id, slot, name, variant: null, order: slot, archived: false });
const days = [day("d1", 1, "Espalda"), day("d2", 2, "Pecho"), day("d4a", 4, "Pierna")];

describe("calendario", () => {
  it("lista las últimas semanas con la más nueva primero", () => {
    expect(recentWeekStarts("2026-11-12", 3)).toEqual(["2026-11-09", "2026-11-02", "2026-10-26"]);
  });

  it("marca qué se entrenó en cada fecha y ignora lo no hecho", () => {
    const [w] = buildCalendar(
      ["2026-11-09"],
      {
        days,
        sessions: [
          { id: "1", date: "2026-11-09", dayId: "d1", done: true },
          { id: "2", date: "2026-11-11", dayId: "d2", done: true },
          { id: "3", date: "2026-11-12", dayId: "d4a", done: false },
          { id: "4", date: "2026-11-09", dayId: "borrado", done: true },
        ],
        logs: [
          { id: "a", date: "2026-11-09", exerciseId: "e1", dayId: "d1", weightKg: 40 },
          { id: "b", date: "2026-11-09", exerciseId: "e2", dayId: "d1", weightKg: 30 },
        ],
        body: [{ date: "2026-11-10", weightKg: 85, measures: {} }],
      },
      "2026-11-12",
    );
    expect(w?.cells).toHaveLength(7);
    expect(w?.trained).toBe(2);
    expect(w?.cells[0]).toMatchObject({ date: "2026-11-09", dayNumber: 9, logged: 2, hasBody: false, isToday: false });
    expect(w?.cells[0]?.sessions.map((s) => s.name)).toEqual(["Espalda"]);
    expect(w?.cells[1]?.hasBody).toBe(true);
    expect(w?.cells[3]).toMatchObject({ isToday: true, sessions: [] });
    expect(w?.cells[4]?.isFuture).toBe(true);
  });

  it("devuelve las 7 fechas de la semana de cualquier día", () => {
    const cells = weekCells("2026-11-13", { days, sessions: [], logs: [], body: [] }, "2026-11-12");
    expect(cells.map((c) => c.date)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
  });

  it("reparte colores por número de día y reinicia después del último", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(slotColorIndex)).toEqual([1, 2, 3, 4, 5, 6, 1]);
  });
});

describe("selección de semanas", () => {
  const week = { from: "2026-11-09", to: "2026-11-15" };

  it("un toque elige una semana", () => {
    expect(selectWeek({ from: "2026-10-26", to: "2026-11-15" }, "2026-11-02")).toEqual({ from: "2026-11-02", to: "2026-11-08" });
  });
  it("un segundo toque arma el rango, para atrás o para adelante", () => {
    expect(selectWeek(week, "2026-10-26")).toEqual({ from: "2026-10-26", to: "2026-11-15" });
    expect(selectWeek({ from: "2026-10-26", to: "2026-11-01" }, "2026-11-09")).toEqual({ from: "2026-10-26", to: "2026-11-15" });
  });
  it("tocar la misma semana la deja sola; con un rango armado se reinicia", () => {
    expect(selectWeek(week, "2026-11-09")).toEqual(week);
    expect(selectWeek({ from: "2026-10-26", to: "2026-11-15" }, "2026-11-09")).toEqual(week);
  });
  it("un rango libre que no es una semana se reinicia al tocar", () => {
    expect(selectWeek({ from: "2026-11-11", to: "2026-11-18" }, "2026-11-09")).toEqual(week);
  });
  it("lista las semanas de una selección, de la más vieja a la más nueva", () => {
    expect(weeksIn({ from: "2026-10-26", to: "2026-11-15" })).toEqual(["2026-10-26", "2026-11-02", "2026-11-09"]);
    expect(weeksIn({ from: "2026-11-11", to: "2026-11-18" })).toEqual(["2026-11-09", "2026-11-16"]);
  });
});
