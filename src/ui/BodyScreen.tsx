import { useMemo } from "react";
import { saveBody } from "../db/actions";
import type { AppData } from "../db/useData";
import { bodyWeekRows, lastBefore, previousWeekStarts } from "../lib/bodyWeeks";
import { weekCells } from "../lib/calendar";
import { formatLong, formatShort, todayISO, weekStart } from "../lib/dates";
import { fmt, fmtDelta } from "../lib/format";
import { Stepper } from "./Stepper";
import { WeekStrip } from "./WeekStrip";

const HISTORY_WEEKS = 12;

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 300;
  const h = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Promedio semanal, de ${fmt(values[0] as number)} a ${fmt(values.at(-1) as number)} kilos`}>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  data: AppData;
  date: string;
  setDate: (date: string) => void;
}

export function BodyScreen({ data, date, setDate }: Props) {
  const today = todayISO();
  const names = data.settings.measureNames;
  const entry = data.body.find((b) => b.date === date);

  const cells = useMemo(() => weekCells(date, data, today), [date, data, today]);
  const week = useMemo(() => bodyWeekRows([weekStart(date)], data.body, names)[0], [date, data.body, names]);
  const history = useMemo(() => bodyWeekRows(previousWeekStarts(today, HISTORY_WEEKS), data.body, names), [today, data.body, names]);
  const trend = useMemo(
    () =>
      [...history]
        .reverse()
        .map((r) => r.avgWeight)
        .filter((v): v is number => v !== null),
    [history],
  );

  const lastWeight = lastBefore(data.body, date, (b) => b.weightKg);
  const isCurrentWeek = weekStart(date) === weekStart(today);

  return (
    <section>
      <header className="bar">
        <h1>Cuerpo</h1>
        {date !== today && (
          <button className="ghost" onClick={() => setDate(today)}>
            Hoy
          </button>
        )}
      </header>

      <WeekStrip variant="body" measureLabel={names.length ? names.join(" / ") : "Medidas"} date={date} today={today} cells={cells} onSelect={setDate} />

      {week && (
        <div className="tiles" aria-label="Estado de la semana">
          <div className={`tile${week.weightCount > 0 ? " ok" : ""}`}>
            <span className="t-label">Peso</span>
            <b>{week.weightCount > 0 ? `✓ ${week.weightCount}` : "Pendiente"}</b>
            <small>{week.avgWeight !== null ? `prom. ${fmt(week.avgWeight, "kg")}${week.weightDelta !== null ? ` (${fmtDelta(week.weightDelta)})` : ""}` : isCurrentWeek ? "1 o 2 por semana" : "sin pesaje"}</small>
          </div>
          {week.measures.map((m) => (
            <div key={m.name} className={`tile${m.count > 0 ? " ok" : ""}`}>
              <span className="t-label">{m.name}</span>
              <b>{m.count > 0 ? `✓ ${m.count}` : "Pendiente"}</b>
              <small>{m.last !== null ? `${fmt(m.last, "cm")}${m.delta !== null ? ` (${fmtDelta(m.delta)})` : ""}` : isCurrentWeek ? "1 o 2 por semana" : "sin medición"}</small>
            </div>
          ))}
        </div>
      )}

      <h2 className="sub cap">Cargar · {formatLong(date)}</h2>
      <ul className="list">
        <li className="card entry">
          <div className="entry-head">
            <span className="name">Peso corporal</span>
            {entry?.weightKg == null && lastWeight && (
              <button className="chipbtn" onClick={() => saveBody(date, { weightKg: lastWeight.value })}>
                Usar {fmt(lastWeight.value, "kg")}
              </button>
            )}
          </div>
          <Stepper key={`w-${date}`} label="Peso corporal" unit="kg" step={0.1} max={400} value={entry?.weightKg ?? null} suggestion={lastWeight?.value ?? null} onCommit={(n) => saveBody(date, { weightKg: n })} />
          <span className="meta">{lastWeight ? `Última vez: ${fmt(lastWeight.value, "kg")} (${formatShort(lastWeight.date)})` : "Todavía no cargaste ningún peso"}</span>
        </li>
        {names.map((name) => {
          const last = lastBefore(data.body, date, (b) => b.measures[name]);
          const current = entry?.measures[name] ?? null;
          return (
            <li key={name} className="card entry">
              <div className="entry-head">
                <span className="name">{name}</span>
                {current === null && last && (
                  <button className="chipbtn" onClick={() => saveBody(date, { measure: { name, value: last.value } })}>
                    Usar {fmt(last.value, "cm")}
                  </button>
                )}
              </div>
              <Stepper key={`${name}-${date}`} label={name} unit="cm" step={0.5} max={400} value={current} suggestion={last?.value ?? null} onCommit={(n) => saveBody(date, { measure: { name, value: n } })} />
              <span className="meta">{last ? `Última vez: ${fmt(last.value, "cm")} (${formatShort(last.date)})` : "Todavía no cargaste esta medida"}</span>
            </li>
          );
        })}
      </ul>

      <h2 className="sub">Evolución</h2>
      <Sparkline values={trend} />
      <ul className="list weeks">
        {history.map((r) => (
          <li key={r.start} className="row tap" onClick={() => setDate(r.start)}>
            <div className="wlabel">{formatShort(r.start)}</div>
            <div className="grow">
              {r.avgWeight !== null ? (
                <>
                  <b>{fmt(r.avgWeight, "kg")}</b> {r.weightDelta !== null && <span className={`delta${r.weightDelta < 0 ? " down" : r.weightDelta > 0 ? " up" : ""}`}>{fmtDelta(r.weightDelta)}</span>}
                </>
              ) : (
                <span className="meta">sin pesaje</span>
              )}
            </div>
            <div className="meta right">
              {r.measures
                .filter((m) => m.last !== null)
                .map((m) => `${m.name} ${fmt(m.last)}`)
                .join(" · ")}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
