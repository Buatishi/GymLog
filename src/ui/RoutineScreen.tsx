import { useEffect, useRef, useState } from "react";
import { addDay, addExercise, swapDays, swapExercises, updateDay, updateExercise } from "../db/actions";
import type { AppData } from "../db/useData";
import type { Variant } from "../lib/types";

function TextField({ value, onCommit, label, placeholder, className, autoFocus }: { value: string; onCommit: (v: string) => void; label: string; placeholder?: string; className?: string; autoFocus?: boolean }) {
  const [text, setText] = useState(value);
  const committed = useRef(value);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const commit = (t: string) => {
    if (t === committed.current) return;
    committed.current = t;
    onCommit(t);
  };
  return (
    <input
      className={className}
      aria-label={label}
      placeholder={placeholder}
      value={text}
      autoComplete="off"
      autoFocus={autoFocus}
      onChange={(e) => {
        setText(e.target.value);
        window.clearTimeout(timer.current);
        const t = e.target.value;
        timer.current = window.setTimeout(() => commit(t), 500);
      }}
      onBlur={() => {
        window.clearTimeout(timer.current);
        commit(text);
      }}
    />
  );
}

export function RoutineScreen({ data }: { data: AppData }) {
  const days = data.days.filter((d) => !d.archived).sort((a, b) => a.order - b.order);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const day = days.find((d) => d.id === pickedId) ?? days[0];
  const all = data.exercises.filter((e) => e.dayId === day?.id).sort((a, b) => a.order - b.order);
  const active = all.filter((e) => !e.archived);
  const archived = all.filter((e) => e.archived);
  const dayIndex = day ? days.findIndex((d) => d.id === day.id) : -1;

  async function onAddDay() {
    const nextSlot = days.reduce((m, d) => Math.max(m, d.slot), 0) + 1;
    setPickedId(await addDay("Nuevo día", nextSlot, null));
  }

  return (
    <section>
      <header className="bar">
        <h1>Rutina</h1>
        <button className="ghost" onClick={onAddDay}>
          + Día
        </button>
      </header>

      <div className="chips">
        {days.map((d) => (
          <button key={d.id} className={`chip${d.id === day?.id ? " on" : ""}`} onClick={() => setPickedId(d.id)}>
            Día {d.slot}
            {d.variant ? ` ${d.variant}` : ""}
          </button>
        ))}
      </div>

      {day && (
        <>
          <div className="card" key={day.id}>
            <label className="field">
              Nombre del día
              <TextField label="Nombre del día" value={day.name} onCommit={(v) => updateDay(day.id, { name: v.trim() || "Sin nombre" })} />
            </label>
            <div className="split">
              <label className="field">
                Número de día
                <select value={day.slot} onChange={(e) => updateDay(day.id, { slot: Number(e.target.value) })}>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Día {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Se hace
                <select value={day.variant ?? ""} onChange={(e) => updateDay(day.id, { variant: (e.target.value || null) as Variant | null })}>
                  <option value="">Todas las semanas</option>
                  <option value="A">Semanas A (alterna)</option>
                  <option value="B">Semanas B (alterna)</option>
                </select>
              </label>
            </div>
            <div className="actions">
              <button className="ghost" disabled={dayIndex <= 0} onClick={() => swapDays(day, days[dayIndex - 1]!)}>
                ← Mover
              </button>
              <button className="ghost" disabled={dayIndex >= days.length - 1} onClick={() => swapDays(day, days[dayIndex + 1]!)}>
                Mover →
              </button>
              <button
                className="ghost danger"
                onClick={() => window.confirm(`¿Quitar "${day.name}"? Su historial se conserva y los PDF viejos no cambian.`) && (updateDay(day.id, { archived: true }), setPickedId(null))}
              >
                Quitar día
              </button>
            </div>
          </div>

          <h2 className="sub">Ejercicios</h2>
          <ul className="list">
            {active.map((e, i) => (
              <li key={e.id} className="card ex">
                <TextField label="Ejercicio" placeholder="Ejercicio" className="big" autoFocus={e.id === focusId} value={e.name} onCommit={(v) => updateExercise(e.id, { name: v.trim() })} />
                <div className="split">
                  <TextField label="Series y repeticiones" placeholder="8-10 x 4" value={e.scheme} onCommit={(v) => updateExercise(e.id, { scheme: v.trim() })} />
                  <TextField label="Nota" placeholder="Nota (opcional)" value={e.note} onCommit={(v) => updateExercise(e.id, { note: v.trim() })} />
                </div>
                <div className="actions">
                  <button className="ghost" aria-label="Subir" disabled={i === 0} onClick={() => swapExercises(e, active[i - 1]!)}>
                    ↑
                  </button>
                  <button className="ghost" aria-label="Bajar" disabled={i === active.length - 1} onClick={() => swapExercises(e, active[i + 1]!)}>
                    ↓
                  </button>
                  <button className="ghost danger" onClick={() => window.confirm(`¿Quitar "${e.name || "este ejercicio"}"? Sus pesos anteriores se conservan.`) && updateExercise(e.id, { archived: true })}>
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button className="primary wide" onClick={async () => setFocusId(await addExercise(day.id))}>
            + Agregar ejercicio
          </button>

          {archived.length > 0 && (
            <details className="archived">
              <summary>Quitados ({archived.length})</summary>
              <ul className="list">
                {archived.map((e) => (
                  <li key={e.id} className="row">
                    <div className="grow">{e.name || "(sin nombre)"}</div>
                    <button className="ghost" onClick={() => updateExercise(e.id, { archived: false })}>
                      Restaurar
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {!day && <p className="empty">No hay días. Tocá “+ Día” para crear uno.</p>}
    </section>
  );
}
