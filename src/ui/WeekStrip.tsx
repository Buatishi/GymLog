import { slotColorIndex, type CalendarCell } from "../lib/calendar";
import { addDays, formatLong, formatRange, weekStart } from "../lib/dates";

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

export function cellLabel(c: CalendarCell): string {
  const base = `${formatLong(c.date)}${c.isToday ? " (hoy)" : ""}`;
  return c.sessions.length ? `${base}: ${c.sessions.map((s) => `Día ${s.slot} ${s.name}`).join(", ")}` : `${base}: sin entrenamiento`;
}

export function bodyCellLabel(c: CalendarCell, measureLabel: string): string {
  const base = `${formatLong(c.date)}${c.isToday ? " (hoy)" : ""}`;
  return `${base}: peso ${c.hasWeight ? "con dato" : "sin dato"}, ${measureLabel.toLowerCase()} ${c.hasMeasures ? "con dato" : "sin dato"}`;
}

interface Props {
  date: string;
  today: string;
  cells: CalendarCell[];
  onSelect: (date: string) => void;
  /** "train": color por día de la rutina. "body": marcas de peso y medidas cargados. */
  variant?: "train" | "body";
  /** Nombre(s) de las medidas, para la leyenda y las etiquetas del modo "body". */
  measureLabel?: string;
}

/** Los 7 días de la semana elegida. Se toca uno para cargar ese día. */
export function WeekStrip({ date, today, cells, onSelect, variant = "train", measureLabel = "Medidas" }: Props) {
  const monday = weekStart(date);
  const isCurrent = monday === weekStart(today);
  const body = variant === "body";
  return (
    <div className="strip">
      <div className="strip-head">
        <button className="ghost icon" aria-label="Semana anterior" onClick={() => onSelect(addDays(date, -7))}>
          ‹
        </button>
        <div>
          <b>{formatRange(monday)}</b>
          <div className="meta">{isCurrent ? "esta semana" : body ? " " : `${cells.filter((c) => c.sessions.length).length} entrenamientos`}</div>
        </div>
        <button className="ghost icon" aria-label="Semana siguiente" disabled={isCurrent} onClick={() => onSelect(addDays(date, 7))}>
          ›
        </button>
      </div>
      <div className="strip-days">
        {cells.map((c, i) => {
          const trained = c.sessions.length > 0;
          const complete = body && c.hasWeight && c.hasMeasures;
          const cls = [
            "daycell",
            !body && trained ? `d${slotColorIndex((c.sessions[0] as { slot: number }).slot)}` : "",
            complete ? "complete" : "",
            c.date === date ? "sel" : "",
            c.isToday ? "today" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button key={c.date} className={cls} disabled={c.isFuture} aria-pressed={c.date === date} aria-label={body ? bodyCellLabel(c, measureLabel) : cellLabel(c)} onClick={() => onSelect(c.date)}>
              <span className="wd">{LETTERS[i]}</span>
              <span className="dn">{c.dayNumber}</span>
              {body && (
                <span className="marks" aria-hidden="true">
                  <i className={`mk w${c.hasWeight ? " on" : ""}`} />
                  <i className={`mk m${c.hasMeasures ? " on" : ""}`} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {body && (
        <div className="strip-legend" aria-hidden="true">
          <span>
            <i className="mk w on" /> Peso
          </span>
          <span>
            <i className="mk m on" /> {measureLabel}
          </span>
        </div>
      )}
    </div>
  );
}
