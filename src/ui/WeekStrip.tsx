import { slotColorIndex, type CalendarCell } from "../lib/calendar";
import { addDays, formatLong, formatRange, weekStart } from "../lib/dates";

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

export function cellLabel(c: CalendarCell): string {
  const base = `${formatLong(c.date)}${c.isToday ? " (hoy)" : ""}`;
  return c.sessions.length ? `${base}: ${c.sessions.map((s) => `Día ${s.slot} ${s.name}`).join(", ")}` : `${base}: sin entrenamiento`;
}

interface Props {
  date: string;
  today: string;
  cells: CalendarCell[];
  onSelect: (date: string) => void;
}

/** Los 7 días de la semana elegida, con color en los que se entrenó. Se toca uno para cargar ese día. */
export function WeekStrip({ date, today, cells, onSelect }: Props) {
  const monday = weekStart(date);
  const isCurrent = monday === weekStart(today);
  return (
    <div className="strip">
      <div className="strip-head">
        <button className="ghost icon" aria-label="Semana anterior" onClick={() => onSelect(addDays(date, -7))}>
          ‹
        </button>
        <div>
          <b>{formatRange(monday)}</b>
          <div className="meta">{isCurrent ? "esta semana" : `${cells.filter((c) => c.sessions.length).length} entrenamientos`}</div>
        </div>
        <button className="ghost icon" aria-label="Semana siguiente" disabled={isCurrent} onClick={() => onSelect(addDays(date, 7))}>
          ›
        </button>
      </div>
      <div className="strip-days">
        {cells.map((c, i) => {
          const trained = c.sessions.length > 0;
          const cls = ["daycell", trained ? `d${slotColorIndex((c.sessions[0] as { slot: number }).slot)}` : "", c.date === date ? "sel" : "", c.isToday ? "today" : ""].filter(Boolean).join(" ");
          return (
            <button key={c.date} className={cls} disabled={c.isFuture} aria-pressed={c.date === date} aria-label={cellLabel(c)} onClick={() => onSelect(c.date)}>
              <span className="wd">{LETTERS[i]}</span>
              <span className="dn">{c.dayNumber}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
