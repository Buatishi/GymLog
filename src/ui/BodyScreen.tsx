import { useState } from "react";
import { saveBody } from "../db/actions";
import type { AppData } from "../db/useData";
import { formatWithWeekday, todayISO } from "../lib/dates";
import { NumberField } from "./NumberField";

const kg = (n: number) => String(n).replace(".", ",");

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 300;
  const h = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Evolución del peso, de ${kg(values[0] as number)} a ${kg(values.at(-1) as number)} kilos`}>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function BodyScreen({ data }: { data: AppData }) {
  const [date, setDate] = useState(todayISO());
  const entry = data.body.find((b) => b.date === date);
  const history = [...data.body].sort((a, b) => b.date.localeCompare(a.date));
  const trend = [...data.body]
    .filter((b) => b.weightKg !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((b) => b.weightKg as number);

  return (
    <section>
      <header className="bar">
        <h1>Cuerpo</h1>
        <div className="datebox">
          <input type="date" aria-label="Fecha de la medición" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          {date !== todayISO() && (
            <button className="ghost" onClick={() => setDate(todayISO())}>
              Hoy
            </button>
          )}
        </div>
      </header>

      <ul className="list">
        <li className="row">
          <div className="grow name">Peso corporal</div>
          <NumberField key={`w-${date}`} label="Peso corporal" unit="kg" value={entry?.weightKg ?? null} max={400} onCommit={(n) => saveBody(date, { weightKg: n })} />
        </li>
        {data.settings.measureNames.map((name) => (
          <li key={name} className="row">
            <div className="grow name">{name}</div>
            <NumberField key={`${name}-${date}`} label={name} unit="cm" value={entry?.measures[name] ?? null} max={400} onCommit={(n) => saveBody(date, { measure: { name, value: n } })} />
          </li>
        ))}
      </ul>
      <p className="hint">Tu plan pide pesarte 2-3 veces por semana y medir la cintura cada 2-4. Cargá solo lo que mediste ese día.</p>

      <Sparkline values={trend} />

      <h2 className="sub">Historial</h2>
      <ul className="list">
        {history.length === 0 && <li className="empty">Todavía no cargaste nada.</li>}
        {history.slice(0, 40).map((b) => (
          <li key={b.date} className="row tap" onClick={() => setDate(b.date)}>
            <div className="grow">{formatWithWeekday(b.date)}</div>
            <div className="meta right">
              {b.weightKg !== null && `${kg(b.weightKg)} kg`}
              {Object.entries(b.measures).map(([k, v]) => ` · ${k} ${kg(v)} cm`)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
