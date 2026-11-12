import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { exportBackup, ensureSeed, GymDB, importBackup } from "./db";

let n = 0;
let d: GymDB;
beforeEach(() => {
  d = new GymDB(`test-${n++}`);
});

describe("base de datos", () => {
  it("carga la rutina del PDF una sola vez", async () => {
    await ensureSeed(d);
    await ensureSeed(d);
    const days = await d.days.toArray();
    expect(days).toHaveLength(5);
    expect(days.filter((x) => x.slot === 4).map((x) => x.variant).sort()).toEqual(["A", "B"]);
    const ex = await d.exercises.toArray();
    expect(ex).toHaveLength(8 + 6 + 6 + 5 + 5);
    expect((await d.settings.get("main"))?.measureNames).toEqual(["Cintura"]);
  });

  it("exporta e importa sin perder nada", async () => {
    await ensureSeed(d);
    const first = (await d.exercises.toArray())[0]!;
    await d.logs.add({ id: `2026-11-09|${first.id}`, date: "2026-11-09", exerciseId: first.id, dayId: first.dayId, weightKg: 42.5 });
    await d.body.add({ date: "2026-11-09", weightKg: 85.2, measures: { Cintura: 92 } });
    const text = JSON.stringify(await exportBackup(d));

    const other = new GymDB(`test-${n++}`);
    await ensureSeed(other);
    await importBackup(text, other);
    expect(await other.logs.toArray()).toEqual(await d.logs.toArray());
    expect(await other.body.toArray()).toEqual(await d.body.toArray());
    expect((await other.exercises.toArray()).length).toBe((await d.exercises.toArray()).length);
  });

  it("un backup roto no toca los datos actuales", async () => {
    await ensureSeed(d);
    await expect(importBackup('{"app":"gymlog","version":1}', d)).rejects.toThrow();
    expect(await d.days.count()).toBe(5);
  });
});
