import { useMemo, useState } from "react";
import type { AppData } from "../db/useData";
import { buildCalendar, recentWeekStarts, selectWeek, slotColorIndex, weeksIn, type Selection } from "../lib/calendar";
import { addDays, formatRange, formatShort, formatSpan, todayISO, weekEnd, weekStart } from "../lib/dates";
import { fmt, fmtDelta } from "../lib/format";
import { shareOrDownload } from "../lib/share";
import { buildRangeReport, buildWeekReport, type WeekData } from "../lib/weekly";

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];
const PAGE = 10; // semanas que se muestran por vez

export function WeekScreen({ data }: { data: AppData }) {
  const today = todayISO();
  const thisMonday = weekStart(today);
  const [sel, setSel] = useState<Selection>({ from: thisMonday, to: weekEnd(thisMonday) });
  const [shown, setShown] = useState(PAGE);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const reportData: WeekData = useMemo(
    () => ({ days: data.days, exercises: data.exercises, sessions: data.sessions, logs: data.logs, body: data.body, measureNames: data.settings.measureNames }),
    [data],
  );
  const calendar = useMemo(() => buildCalendar(recentWeekStarts(today, shown), data, today), [data, today, shown]);
  const report = useMemo(() => buildRangeReport(sel.from, sel.to, reportData), [sel, reportData]);
  const weeks = weeksIn(sel);

  const legend = useMemo(() => {
    const bySlot = new Map<number, string[]>();
    for (const d of data.days.filter((x) => !x.archived).sort((a, b) => a.order - b.order)) bySlot.set(d.slot, [...(bySlot.get(d.slot) ?? []), d.name]);
    return [...bySlot.entries()].sort((a, b) => a[0] - b[0]);
  }, [data.days]);

  const last = (n: number): Selection => ({ from: addDays(thisMonday, -7 * (n - 1)), to: weekEnd(thisMonday) });
  const presets: { label: string; value: Selection }[] = [
    { label: "Esta semana", value: last(1) },
    { label: "Últimas 4", value: last(4) },
    { label: "Últimas 8", value: last(8) },
  ];
  const same = (a: Selection, b: Selection) => a.from === b.from && a.to === b.to;

  async function onShare() {
    setBusy(true);
    setMsg("");
    try {
      // jsPDF pesa ~700 KB: se carga recién al generar el PDF para que la app abra rápido.
      const { buildWeeksPdf, weeksPdfFilename } = await import("../lib/pdf");
      const reports = weeks.map((w) => buildWeekReport(w, reportData));
      const res = await shareOrDownload(buildWeeksPdf(reports).output("blob"), weeksPdfFilename(reports), `Seguimiento ${formatSpan(sel.from, sel.to)}`);
      if (res === "downloaded") setMsg("PDF descargado.");
    } catch {
      setMsg("No se pudo generar el PDF.");
    } finally {
      setBusy(false);
    }
  }

  const single = weeks.length === 1;

  return (
    <section>
      <header className="bar">
        <h1>Semana</h1>
      </header>

      <div className="card summary">
        <div>
          <div className="range">{single ? formatRange(sel.from) : formatSpan(sel.from, sel.to)}</div>
          <div className="meta">{single ? (sel.from === thisMonday ? "esta semana" : "1 semana") : `${weeks.length} semanas`}</div>
        </div>
        <div className="stats">
          <div>
            <b>{report.trainedDays}</b>
            <span>días entrenados</span>
          </div>
          <div>
            <b>{fmt(report.avgWeight, "kg")}</b>
            <span>peso promedio</span>
          </div>
          <div>
            <b>{fmtDelta(report.weightDelta, "kg")}</b>
            <span>vs. período anterior</span>
          </div>
        </div>
        <button className="primary" onClick={onShare} disabled={busy}>
          {busy ? "Generando…" : single ? "Compartir PDF para la nutri" : `Compartir PDF · ${weeks.length} semanas`}
        </button>
        {!single && <p className="hint flush">Un solo PDF con una hoja por semana.</p>}
        {msg && (
          <p className="hint flush" role="status">
            {msg}
          </p>
        )}
      </div>

      <div className="chips" aria-label="Atajos de período">
        {presets.map((p) => (
          <button key={p.label} className={`chip${same(sel, p.value) ? " on" : ""}`} onClick={() => setSel(p.value)}>
            {p.label}
          </button>
        ))}
      </div>
      <p className="hint">Tocá una semana para elegirla; tocá otra para armar un rango de semanas.</p>

      <div className="heat" role="group" aria-label="Calendario de entrenamientos">
        <div className="heat-row head" aria-hidden="true">
          <span />
          {LETTERS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
          <span />
        </div>
        {calendar.map((w) => {
          const selected = w.start >= weekStart(sel.from) && w.start <= sel.to;
          return (
            <div key={w.start} className={`heat-row${selected ? " sel" : ""}`}>
              <button className="wk" aria-pressed={selected} aria-label={`Semana del ${formatRange(w.start)}`} onClick={() => setSel(selectWeek(sel, w.start))}>
                {formatShort(w.start)}
              </button>
              {w.cells.map((c) => {
                const trained = c.sessions.length > 0;
                const cls = ["hcell", trained ? `d${slotColorIndex((c.sessions[0] as { slot: number }).slot)}` : "", c.isToday ? "today" : "", c.isFuture ? "future" : ""].filter(Boolean).join(" ");
                return (
                  <span key={c.date} className={cls}>
                    {c.dayNumber}
                  </span>
                );
              })}
              <span className="count">{w.trained || ""}</span>
            </div>
          );
        })}
      </div>
      <button className="ghost wide" onClick={() => setShown(shown + PAGE)}>
        Ver {PAGE} semanas más
      </button>

      <ul className="legend" aria-label="Colores de cada día">
        {legend.map(([slot, names]) => (
          <li key={slot}>
            <i className={`d${slotColorIndex(slot)}`} />
            Día {slot} · {names.join(" / ")}
          </li>
        ))}
      </ul>

      <h2 className="sub">Detalle del período</h2>
      <div className="card">
        <h2 className="sub flush">Peso corporal</h2>
        {report.weights.length === 0 ? (
          <p className="meta">Sin pesajes en este período.</p>
        ) : (
          <>
            <p>
              Promedio <b>{fmt(report.avgWeight, "kg")}</b> · anterior {fmt(report.previousAvgWeight, "kg")} · dif. <b>{fmtDelta(report.weightDelta, "kg")}</b>
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

      {report.blocks.length === 0 && <p className="empty">No hay entrenamientos en este período.</p>}
      {report.blocks.map((b) => (
        <div className="card" key={b.day.id}>
          <h2 className="sub flush">
            Día {b.day.slot} · {b.day.name}
          </h2>
          <table>
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>{single ? "Máx." : "Máx. del período"}</th>
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
