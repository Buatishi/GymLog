import { useMemo, useState } from "react";
import { setDayDone, setVariantAnchor, setWeight } from "../db/actions";
import type { AppData } from "../db/useData";
import { formatShort, todayISO } from "../lib/dates";
import { activeVariant, anchorFor, daysForWeek, siblingOf } from "../lib/variants";
import { NumberField } from "./NumberField";

export function TrainScreen({ data }: { data: AppData }) {
  const [date, setDate] = useState(todayISO());
  const [pickedDayId, setPickedDayId] = useState<string | null>(null);

  const days = useMemo(() => daysForWeek(data.days, date, data.settings.variantAnchor), [data.days, date, data.settings.variantAnchor]);
  const day = days.find((d) => d.id === pickedDayId) ?? days[0];
  const variant = activeVariant(date, data.settings.variantAnchor);
  const alternating = day?.variant ? day : days.find((d) => d.variant !== null);
  const sibling = alternating ? siblingOf(data.days, alternating) : undefined;

  const exercises = day ? data.exercises.filter((e) => e.dayId === day.id && !e.archived).sort((a, b) => a.order - b.order) : [];
  const doneIds = new Set(data.sessions.filter((s) => s.date === date && s.done).map((s) => s.dayId));
  const isDone = day ? doneIds.has(day.id) : false;

  // Último peso anterior a la fecha elegida, por ejercicio.
  const lastBefore = useMemo(() => {
    const m = new Map<string, { date: string; weightKg: number }>();
    for (const l of data.logs) {
      if (l.date >= date) continue;
      const cur = m.get(l.exerciseId);
      if (!cur || l.date > cur.date) m.set(l.exerciseId, { date: l.date, weightKg: l.weightKg });
    }
    return m;
  }, [data.logs, date]);

  const weightOn = (exerciseId: string) => data.logs.find((l) => l.id === `${date}|${exerciseId}`)?.weightKg ?? null;

  return (
    <section>
      <header className="bar">
        <h1>Entrenar</h1>
        <div className="datebox">
          <input type="date" aria-label="Fecha del entrenamiento" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          {date !== todayISO() && (
            <button className="ghost" onClick={() => setDate(todayISO())}>
              Hoy
            </button>
          )}
        </div>
      </header>

      {alternating && sibling && (
        <p className="banner">
          Esta semana el día {alternating.slot} es <b>{(variant === alternating.variant ? alternating : sibling).name}</b>.{" "}
          <button className="link" onClick={() => setVariantAnchor(anchorFor(date, variant === "A" ? "B" : "A"))}>
            Cambiar a {(variant === alternating.variant ? sibling : alternating).name}
          </button>
        </p>
      )}

      <div className="chips" role="tablist">
        {days.map((d) => (
          <button key={d.id} role="tab" aria-selected={d.id === day?.id} className={`chip${d.id === day?.id ? " on" : ""}`} onClick={() => setPickedDayId(d.id)}>
            Día {d.slot}
            {doneIds.has(d.id) && <i aria-label="hecho"> ✓</i>}
          </button>
        ))}
      </div>

      {!day && <p className="empty">No hay días en la rutina. Agregalos en la pestaña Rutina.</p>}

      {day && (
        <>
          <div className="dayhead">
            <h2>{day.name}</h2>
            <button className={`toggle${isDone ? " on" : ""}`} aria-pressed={isDone} onClick={() => setDayDone(date, day.id, !isDone)}>
              {isDone ? "Hecho ✓" : "Marcar hecho"}
            </button>
          </div>
          <p className="hint">Anotá el peso máximo que levantaste en cada ejercicio. Se guarda solo.</p>
          <ul className="list">
            {exercises.map((e) => {
              const last = lastBefore.get(e.id);
              return (
                <li key={e.id} className="row">
                  <div className="grow">
                    <div className="name">{e.name || "(sin nombre)"}</div>
                    <div className="meta">
                      {e.scheme}
                      {e.note && ` · ${e.note}`}
                    </div>
                    {last && (
                      <div className="meta">
                        Última vez: {String(last.weightKg).replace(".", ",")} kg ({formatShort(last.date)})
                      </div>
                    )}
                  </div>
                  <NumberField key={`${date}|${e.id}`} label={`Peso de ${e.name}`} value={weightOn(e.id)} unit="kg" onCommit={(n) => setWeight(date, e, n)} />
                </li>
              );
            })}
            {exercises.length === 0 && <li className="empty">Este día no tiene ejercicios.</li>}
          </ul>
        </>
      )}
    </section>
  );
}
