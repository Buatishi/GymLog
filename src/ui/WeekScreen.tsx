import { useMemo, useState } from "react";
import type { AppData } from "../db/useData";
import { buildCalendar, recentWeekStarts, selectWeek, slotColorIndex, weeksIn, type Selection } from "../lib/calendar";
import { addDays, daysBetween, formatRange, formatShort, formatSpan, todayISO, weekEnd, weekStart } from "../lib/dates";
import { fmt, fmtDelta } from "../lib/format";
import { shareOrDownload } from "../lib/share";
import { buildRangeReport, buildWeekReport, type WeekData } from "../lib/weekly";
import { DaySheet } from "./DaySheet";
import { cellLabel } from "./WeekStrip";

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];
const PAGE = 10; // semanas que se muestran por vez

interface Props {
  data: AppData;
  onEditDay: (date: string) => void;
  onEditBody: (date: string) => void;
}

export function WeekScreen({ data, onEditDay, onEditBody }: Props) {
  const today = todayISO();
  const thisMonday = weekStart(today);
  const [sel, setSel] = useState<Selection>({ from: thisMonday, to: weekEnd(thisMonday) });
  const [shown, setShown] = useState(PAGE);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [free, setFree] = useState(false);
  const [openDate, setOpenDate] = useState<string | null>(null);

  const reportData: WeekData = useMemo(
    () => ({ days: data.days, exercises: data.exercises, sessions: data.sessions, logs: data.logs, body: data.body, measureNames: data.settings.measureNames }),
    [data],
  );
  const calendar = useMemo(() => buildCalendar(recentWeekStarts(today, shown), data, today), [data, today, shown]);
  const report = useMemo(() => buildRangeReport(sel.from, sel.to, reportData), [sel, reportData]);
  // El PDF se arma por semanas completas: solo se ofrece si la selección es de lunes a domingo.
  const aligned = sel.from === weekStart(sel.from) && sel.to === weekEnd(weekStart(sel.to));
  const weeks = aligned ? weeksIn(sel) : [];
  const spanDays = daysBetween(sel.from, sel.to) + 1;

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
    if (!aligned) return;
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

  const single = aligned && weeks.length === 1;

  function toggleFree() {
    if (free) {
      // Al volver a semanas, la selección se ajusta a las semanas completas que toca.
      setSel({ from: weekStart(sel.from), to: weekEnd(weekStart(sel.to)) });
    } else if (sel.to > today) {
      setSel({ from: sel.from, to: today });
    }
    setFree(!free);
  }

  function setFrom(v: string) {
    if (v) setSel({ from: v, to: v > sel.to ? v : sel.to });
  }
  function setTo(v: string) {
    if (v) setSel({ from: v < sel.from ? v : sel.from, to: v });
  }

  return (
    <section>
      <header className="bar">
        <h1>Semana</h1>
      </header>

      <div className="card summary">
        <div>
          <div className="range">{single ? formatRange(sel.from) : formatSpan(sel.from, sel.to)}</div>
          <div className="meta">{!aligned ? `${spanDays} días · rango libre` : single ? (sel.from === thisMonday ? "esta semana" : "1 semana") : `${weeks.length} semanas`}</div>
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
        {aligned ? (
          <>
            <button className="primary" onClick={onShare} disabled={busy}>
              {busy ? "Generando…" : single ? "Compartir PDF para la nutri" : `Compartir PDF · ${weeks.length} semanas`}
            </button>
            {!single && <p className="hint flush">Un solo PDF con una hoja por semana.</p>}
          </>
        ) : (
          <p className="hint flush">Este rango es solo para mirar. El PDF se arma con semanas completas (lunes a domingo).</p>
        )}
        {msg && (
          <p className="hint flush" role="status">
            {msg}
          </p>
        )}
      </div>

      <div className="chips wrap" aria-label="Atajos de período">
        {presets.map((p) => (
          <button key={p.label} className={`chip${same(sel, p.value) ? " on" : ""}`} onClick={() => {
              setFree(false);
              setSel(p.value);
            }}>
            {p.label}
          </button>
        ))}
        <button className={`chip${free ? " on" : ""}`} aria-pressed={free} onClick={toggleFree}>
          Rango libre
        </button>
      </div>
      {free ? (
        <div className="split free">
          <label className="field">
            Desde
            <input type="date" value={sel.from} max={today} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            Hasta
            <input type="date" value={sel.to > today ? today : sel.to} max={today} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      ) : (
        <p className="hint">Tocá una semana para elegirla; tocá otra para armar un rango de semanas.</p>
      )}

      <div className="heat" role="group" aria-label="Calendario de entrenamientos">
        <div className="heat-row head" aria-hidden="true">
          <span />
          {LETTERS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
          <span />
        </div>
        {calendar.map((w) => {
          const selected = !free && w.start >= weekStart(sel.from) && w.start <= sel.to;
          return (
            <div key={w.start} className={`heat-row${selected ? " sel" : ""}`}>
              <button className="wk" aria-pressed={selected} aria-label={`Semana del ${formatRange(w.start)}`} onClick={() => setSel(selectWeek(sel, w.start))}>
                {formatShort(w.start)}
              </button>
              {w.cells.map((c) => {
                const trained = c.sessions.length > 0;
                const inSel = free && c.date >= sel.from && c.date <= sel.to;
                const cls = ["hcell", inSel ? "insel" : "", trained ? `d${slotColorIndex((c.sessions[0] as { slot: number }).slot)}` : "", c.isToday ? "today" : "", c.isFuture ? "future" : ""].filter(Boolean).join(" ");
                return (
                  <button key={c.date} className={cls} disabled={c.isFuture} aria-label={cellLabel(c)} onClick={() => setOpenDate(c.date)}>
                    {c.dayNumber}
                  </button>
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
      <DaySheet date={openDate} data={data} onClose={() => setOpenDate(null)} onEdit={(d) => {
          setOpenDate(null);
          onEditDay(d);
        }}
        onEditBody={(d) => {
          setOpenDate(null);
          onEditBody(d);
        }}
      />
    </section>
  );
}
