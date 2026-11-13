import { describe, expect, it } from "vitest";
import { buildWeekPdf, buildWeeksPdf, weeksPdfFilename } from "./pdf";
import { fmt, fmtDelta } from "./format";
import { buildWeekReport } from "./weekly";
import { buildSeed } from "../db/seed";

describe("formato", () => {
  it("usa coma decimal y no deja ceros de más", () => {
    expect(fmt(85.5, "kg")).toBe("85,5 kg");
    expect(fmt(92)).toBe("92");
    expect(fmt(84.1666, "kg")).toBe("84,17 kg");
    expect(fmt(null)).toBe("-");
  });
  it("marca el signo de las diferencias", () => {
    expect(fmtDelta(2.5, "kg")).toBe("+2,5 kg");
    expect(fmtDelta(-1.33)).toBe("-1,33");
    expect(fmtDelta(0)).toBe("0");
    expect(fmtDelta(null)).toBe("-");
  });
});

describe("PDF semanal", () => {
  it("genera un PDF con la rutina completa y datos", () => {
    let i = 0;
    const seed = buildSeed(() => `id${i++}`);
    const [d1, d2, , d4a] = seed.days;
    const first = (dayId: string) => seed.exercises.filter((e) => e.dayId === dayId);
    const logs = [
      ...first(d1!.id).map((e, k) => ({ id: `2026-11-09|${e.id}`, date: "2026-11-09", exerciseId: e.id, dayId: d1!.id, weightKg: 30 + k })),
      ...first(d2!.id).map((e, k) => ({ id: `2026-11-10|${e.id}`, date: "2026-11-10", exerciseId: e.id, dayId: d2!.id, weightKg: 40 + k })),
      ...first(d4a!.id).map((e, k) => ({ id: `2026-11-12|${e.id}`, date: "2026-11-12", exerciseId: e.id, dayId: d4a!.id, weightKg: 60 + k })),
    ];
    const report = buildWeekReport("2026-11-09", {
      ...seed,
      sessions: [{ id: "2026-11-09|" + d1!.id, date: "2026-11-09", dayId: d1!.id, done: true }],
      logs,
      body: [
        { date: "2026-11-09", weightKg: 86, measures: { Cintura: 93 } },
        { date: "2026-11-11", weightKg: 85.4, measures: {} },
      ],
      measureNames: ["Cintura"],
    });
    const doc = buildWeekPdf(report);
    const bytes = doc.output("arraybuffer");
    expect(new TextDecoder("latin1").decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("junta varias semanas en un solo PDF, una sección por semana", () => {
    const empty = { days: [], exercises: [], sessions: [], logs: [], body: [], measureNames: ["Cintura"] };
    const reports = ["2026-10-26", "2026-11-02", "2026-11-09"].map((w) => buildWeekReport(w, empty));
    expect(buildWeeksPdf(reports).getNumberOfPages()).toBe(3);
    expect(weeksPdfFilename(reports)).toBe("seguimiento-2026-10-26-a-2026-11-15.pdf");
    expect(weeksPdfFilename(reports.slice(0, 1))).toBe("seguimiento-semana-2026-10-26.pdf");
  });

  it("no falla con una semana vacía", () => {
    const report = buildWeekReport("2026-11-09", { days: [], exercises: [], sessions: [], logs: [], body: [], measureNames: ["Cintura"] });
    expect(buildWeekPdf(report).getNumberOfPages()).toBe(1);
  });
});
