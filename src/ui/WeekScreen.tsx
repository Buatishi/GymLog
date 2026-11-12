import { useMemo, useState } from "react";
import type { AppData } from "../db/useData";
import { addDays, formatRange, todayISO, weekStart } from "../lib/dates";
import { fmt, fmtDelta } from "../lib/format";
import { shareOrDownload } from "../lib/share";
import { buildWeekReport } from "../lib/weekly";

export function WeekScreen({ data }: { data: AppData }) {
  const thisMonday = weekStart(todayISO());
  const [start, setStart] = useState(thisMonday);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const report = useMemo(
    () => buildWeekReport(start, { days: data.days, exercises: data.exercises, sessions: data.sessions, logs: data.logs, body: data.body, measureNames: data.settings.measureNames }),
    [start, data],
  );

  async function onShare() {
    setBusy(true);
    setMsg("");
    try {
      // jsPDF pesa ~700 KB: se carga recién al generar el PDF para que la app abra rápido.
      const { buildWeekPdf, weekPdfFilename } = await import("../lib/pdf");
      const blob = buildWeekPdf(report).output("blob");
      const res = await shareOrDownload(blob, weekPdfFilename(report), `Seguimiento ${formatRange(start)}`);
      if (res === "downloaded") setMsg("PDF descargado.");
    } catch {
      setMsg("No se pudo generar el PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <header className="bar">
        <h1>Semana</h1>
      </header>

      <div className="weeknav">
        <button className="ghost" aria-label="Semana anterior" onClick={() => setStart(addDays(start, -7))}>
          ‹
        </button>
        <div>
          <b>{formatRange(start)}</b>
          {start === thisMonday && <div className="meta">esta semana</div>}
        </div>
        <button className="ghost" aria-label="Semana siguiente" disabled={start >= thisMonday} onClick={() => setStart(addDays(start, 7))}>
          ›
        </button>
      </div>

      <button className="primary wide" onClick={onShare} disabled={busy}>
        {busy ? "Generando…" : "Compartir PDF para la nutri"}
      </button>
      {msg && <p className="hint" role="status">{msg}</p>}

      <div className="card">
        <h2 className="sub flush">Peso corporal</h2>
        {report.weights.length === 0 ? (
          <p className="meta">Sin pesajes esta semana.</p>
        ) : (
          <>
            <p>
              Promedio <b>{fmt(report.avgWeight, "kg")}</b> · semana anterior {fmt(report.previousAvgWeight, "kg")} · dif. <b>{fmtDelta(report.weightDelta, "kg")}</b>
            </p>
            <p className="meta">{report.weights.length} {report.weights.length === 1 ? "pesaje" : "pesajes"}</p>
          </>
        )}
        {report.measures.filter((m) => m.value !== null).map((m) => (
          <p key={m.name}>
            {m.name}: <b>{fmt(m.value, "cm")}</b> <span className="meta">{m.previous === null ? "(primera medición)" : `(antes ${fmt(m.previous, "cm")}, ${fmtDelta(m.delta, "cm")})`}</span>
          </p>
        ))}
      </div>

      {report.blocks.length === 0 && <p className="empty">No hay entrenamientos esta semana.</p>}
      {report.blocks.map((b) => (
        <div className="card" key={b.day.id}>
          <h2 className="sub flush">
            Día {b.day.slot} · {b.day.name}
          </h2>
          <table>
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Máx.</th>
                <th>Dif.</th>
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={r.exercise.id}>
                  <td>
                    {r.exercise.name}
                    <div className="meta">{r.exercise.scheme}</div>
                  </td>
                  <td className="right">{fmt(r.max, "kg")}</td>
                  <td className="right">{fmtDelta(r.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
