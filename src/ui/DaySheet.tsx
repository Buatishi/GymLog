import { useEffect, useRef } from "react";
import type { AppData } from "../db/useData";
import { slotColorIndex } from "../lib/calendar";
import { buildDayDetail } from "../lib/dayDetail";
import { formatLong } from "../lib/dates";
import { fmt } from "../lib/format";

interface Props {
  date: string | null;
  data: AppData;
  onClose: () => void;
  onEdit: (date: string) => void;
  onEditBody: (date: string) => void;
}

/** Hoja con todo lo registrado en un día. Usa <dialog>: se cierra con Esc, con el fondo o con el botón. */
export function DaySheet({ date, data, onClose, onEdit, onEditBody }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (date && !d.open) d.showModal();
    if (!date && d.open) d.close();
  }, [date]);

  const detail = date ? buildDayDetail(date, data) : null;
  const empty = detail ? detail.blocks.length === 0 && !detail.body : false;
  const measures = detail?.body ? Object.entries(detail.body.measures) : [];

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={date ? formatLong(date) : "Detalle del día"}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {detail && date && (
        <div className="sheet-body">
          <h2 className="cap">{formatLong(date)}</h2>

          {empty && <p className="meta">Sin registros este día.</p>}

          {detail.blocks.map((b) => (
            <div key={b.day.id} className="sheet-block">
              <div className="sheet-title">
                <i className={`d${slotColorIndex(b.day.slot)}`} />
                Día {b.day.slot} · {b.day.name}
              </div>
              {b.lifts.length === 0 ? (
                <p className="meta">Marcado como hecho, sin pesos cargados.</p>
              ) : (
                <ul className="lifts">
                  {b.lifts.map((l) => (
                    <li key={l.name + l.scheme}>
                      <span>
                        {l.name}
                        <small>{l.scheme}</small>
                      </span>
                      <b>{fmt(l.weightKg, "kg")}</b>
                    </li>
                  ))}
                </ul>
              )}
              {b.lifts.length > 0 && b.pending > 0 && <p className="meta">{b.pending} sin peso cargado</p>}
            </div>
          ))}

          {detail.body && (
            <div className="sheet-block">
              <div className="sheet-title">Cuerpo</div>
              <p className="body-line">
                {detail.body.weightKg !== null && <b>{fmt(detail.body.weightKg, "kg")}</b>}
                {measures.map(([name, v]) => (
                  <span key={name}>
                    {name} <b>{fmt(v, "cm")}</b>
                  </span>
                ))}
              </p>
            </div>
          )}

          <div className="actions">
            <button className="primary grow" onClick={() => date && onEdit(date)}>
              {empty ? "Cargar este día" : "Editar este día"}
            </button>
            <button className="ghost" onClick={() => date && onEditBody(date)}>
              Cuerpo
            </button>
            <button className="ghost" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
