import { useMemo, useState } from "react";
import { setDayDone, setVariantAnchor, setWeight } from "../db/actions";
import type { AppData } from "../db/useData";
import { weekCells } from "../lib/calendar";
import { formatShort, todayISO, weekdayShort, weekEnd, weekStart } from "../lib/dates";
import { activeVariant, anchorFor, daysForWeek, siblingOf } from "../lib/variants";
import { NumberField } from "./NumberField";
import { WeekStrip } from "./WeekStrip";

interface Props {
  data: AppData;
  date: string;
  setDate: (date: string) => void;
}

export function TrainScreen({ data, date, setDate }: Props) {
  const [pickedDayId, setPickedDayId] = useState<string | null>(null);
  const today = todayISO();

  const days = useMemo(() => daysForWeek(data.days, date, data.settings.variantAnchor), [data.days, date, data.settings.variantAnchor]);
  // Si en la fecha elegida ya se entrenó, se abre directo ese día de la rutina.
  const trainedOnDate = data.sessions.find((s) => s.date === date && s.done && days.some((d) => d.id === s.dayId));
  const day = days.find((d) => d.id === pickedDayId) ?? days.find((d) => d.id === trainedOnDate?.dayId) ?? days[0];
  const variant = activeVariant(date, data.settings.variantAnchor);
  const alternating = day?.variant ? day : days.find((d) => d.variant !== null);
  const sibling = alternating ? siblingOf(data.days, alternating) : undefined;

  const cells = useMemo(() => weekCells(date, data, today), [date, data, today]);

  // Qué días de la rutina ya se hicieron en la semana elegida (y en qué fecha).
  const doneThisWeek = useMemo(() => {
    const from = weekStart(date);
    const to = weekEnd(from);
    const m = new Map<string, string>();
    for (const s of data.sessions) if (s.done && s.date >= from && s.date <= to) m.set(s.dayId, s.date);
    return m;
  }, [data.sessions, date]);

  const exercises = day ? data.exercises.filter((e) => e.dayId === day.id && !e.archived).sort((a, b) => a.order - b.order) : [];
  const isDone = day ? data.sessions.some((s) => s.id === `${date}|${day.id}` && s.done) : false;

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
  const loaded = exercises.filter((e) => weightOn(e.id) !== null).length;

  return (
    <section>
      <header className="bar">
        <h1>Entrenar</h1>
        {date !== today && (
          <button className="ghost" onClick={() => setDate(today)}>
            Hoy
          </button>
        )}
      </header>

      <WeekStrip
        date={date}
        today={today}
        cells={cells}
        onSelect={(d) => {
          setDate(d);
          setPickedDayId(null);
        }}
      />

      {alternating && sibling && (
        <p className="banner">
          Esta semana el día {alternating.slot} es <b>{(variant === alternating.variant ? alternating : sibling).name}</b>.{" "}
          <button className="link" onClick={() => setVariantAnchor(anchorFor(date, variant === "A" ? "B" : "A"))}>
            Cambiar a {(variant === alternating.variant ? sibling : alternating).name}
          </button>
        </p>
      )}

      <div className="chips" role="tablist" aria-label="Días de la rutina">
        {days.map((d) => {
          const doneOn = doneThisWeek.get(d.id);
          return (
            <button key={d.id} role="tab" aria-selected={d.id === day?.id} className={`chip two${d.id === day?.id ? " on" : ""}${doneOn ? " done" : ""}`} onClick={() => setPickedDayId(d.id)}>
              <span>Día {d.slot}</span>
              <small>{doneOn ? `${weekdayShort(doneOn)} ${formatShort(doneOn).split(" ")[0]} ✓` : "pendiente"}</small>
            </button>
          );
        })}
      </div>

      {!day && <p className="empty">No hay días en la rutina. Agregalos en la pestaña Rutina.</p>}

      {day && (
        <>
          <div className="dayhead">
            <div>
              <h2>{day.name}</h2>
              <div className="meta">{exercises.length ? `${loaded} de ${exercises.length} con peso` : "Sin ejercicios"}</div>
            </div>
            <button className={`toggle${isDone ? " on" : ""}`} aria-pressed={isDone} onClick={() => setDayDone(date, day.id, !isDone)}>
              {isDone ? "Hecho ✓" : "Marcar hecho"}
            </button>
          </div>
          <ul className="list">
            {exercises.map((e) => {
              const last = lastBefore.get(e.id);
              return (
                <li key={e.id} className="row lift">
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
