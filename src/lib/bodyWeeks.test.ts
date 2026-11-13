import { describe, expect, it } from "vitest";
import { buildCalendar } from "./calendar";
import { bodyWeekRows, lastBefore, previousWeekStarts } from "./bodyWeeks";
import type { BodyEntry } from "./types";

const entry = (date: string, weightKg: number | null, measures: Record<string, number> = {}): BodyEntry => ({ date, weightKg, measures });

describe("semanas de cuerpo", () => {
  const body = [
    entry("2026-10-20", 87, { Cintura: 95 }),
    entry("2026-10-22", 86, {}),
    // semana del 26 oct sin pesajes (se salteó)
    entry("2026-11-10", 85, { Cintura: 93 }),
    entry("2026-11-13", 84.5, { Cintura: 92.5 }),
  ];

  it("cuenta pesajes, promedia y compara con la última semana que tuvo datos", () => {
    const [week] = bodyWeekRows(["2026-11-09"], body, ["Cintura"]);
    expect(week?.weightCount).toBe(2);
    expect(week?.avgWeight).toBe(84.75);
    expect(week?.weightDelta).toBe(-1.75); // contra 86,5 de la semana del 19 oct
  });

  it("toma la última medida de la semana y la compara con la anterior", () => {
    const [week] = bodyWeekRows(["2026-11-09"], body, ["Cintura"]);
    expect(week?.measures[0]).toEqual({ name: "Cintura", count: 2, last: 92.5, delta: -2.5 });
  });

  it("una semana sin datos queda pendiente, sin NaN", () => {
    const [week] = bodyWeekRows(["2026-10-26"], body, ["Cintura"]);
    expect(week).toMatchObject({ weightCount: 0, avgWeight: null });
    expect(week?.measures[0]).toEqual({ name: "Cintura", count: 0, last: null, delta: null });
  });

  it("devuelve una fila por semana pedida y mantiene el orden", () => {
    const rows = bodyWeekRows(previousWeekStarts("2026-11-12", 3), body, ["Cintura"]);
    expect(rows.map((r) => r.start)).toEqual(["2026-11-09", "2026-11-02", "2026-10-26"]);
  });

  it("sugiere desde la última medición anterior a la fecha", () => {
    expect(lastBefore(body, "2026-11-12", (b) => b.weightKg)).toEqual({ date: "2026-11-10", value: 85 });
    expect(lastBefore(body, "2026-11-12", (b) => b.measures.Cintura)).toEqual({ date: "2026-11-10", value: 93 });
    expect(lastBefore(body, "2026-10-01", (b) => b.weightKg)).toBeNull();
  });
});

describe("marcas de cuerpo en el calendario", () => {
  it("distingue días con peso, con medidas, con ambos y vacíos", () => {
    const [w] = buildCalendar(
      ["2026-11-09"],
      { days: [], sessions: [], logs: [], body: [entry("2026-11-09", 85, {}), entry("2026-11-10", null, { Cintura: 92 }), entry("2026-11-11", 84, { Cintura: 91 })] },
      "2026-11-15",
    );
    const flags = w?.cells.slice(0, 4).map((c) => [c.hasWeight, c.hasMeasures, c.hasBody]);
    expect(flags).toEqual([
      [true, false, true],
      [false, true, true],
      [true, true, true],
      [false, false, false],
    ]);
  });
});
