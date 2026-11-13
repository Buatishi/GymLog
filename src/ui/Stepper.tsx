import { useEffect, useRef, useState } from "react";
import { parseNumber } from "./NumberField";

const show = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));
const round = (n: number) => Math.round(n * 100) / 100;

interface Props {
  label: string;
  unit: string;
  value: number | null;
  /** Valor desde el cual parten los botones +/- cuando todavía no hay nada cargado (el último conocido). */
  suggestion: number | null;
  step: number;
  max: number;
  onCommit: (n: number | null) => void;
}

/** Campo numérico grande con botones − / + para ajustar de a poco. Guarda solo (al escribir, al salir y en cada paso). */
export function Stepper({ label, unit, value, suggestion, step, max, onCommit }: Props) {
  const [text, setText] = useState(show(value));
  const input = useRef<HTMLInputElement>(null);
  const committed = useRef(value);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Si el valor cambia desde afuera (otra fecha, restaurar backup) y no se está escribiendo, se actualiza el texto.
  useEffect(() => {
    if (document.activeElement !== input.current) {
      setText(show(value));
      committed.current = value;
    }
  }, [value]);

  const parsed = parseNumber(text, max);
  const bad = parsed === undefined;
  const base = typeof parsed === "number" ? parsed : bad ? null : (suggestion ?? null);

  function commit(n: number | null) {
    if (n === committed.current) return;
    committed.current = n;
    onCommit(n);
  }

  function bump(dir: 1 | -1) {
    if (base === null) return;
    const next = round(base + dir * step);
    if (next <= 0 || next > max) return;
    window.clearTimeout(timer.current);
    setText(show(next));
    commit(next);
  }

  return (
    <div className={`stepper${bad ? " bad" : ""}`}>
      <button type="button" aria-label={`Restar ${String(step).replace(".", ",")} a ${label}`} disabled={base === null} onClick={() => bump(-1)}>
        −
      </button>
      <label className="stepper-field">
        <input
          ref={input}
          aria-label={label}
          inputMode="decimal"
          autoComplete="off"
          placeholder={suggestion !== null ? show(suggestion) : "—"}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            window.clearTimeout(timer.current);
            const t = e.target.value;
            timer.current = window.setTimeout(() => {
              const n = parseNumber(t, max);
              if (n !== undefined) commit(n);
            }, 400);
          }}
          onBlur={() => {
            window.clearTimeout(timer.current);
            const n = parseNumber(text, max);
            if (n !== undefined) commit(n);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          onFocus={(e) => e.currentTarget.select()}
        />
        <span>{unit}</span>
      </label>
      <button type="button" aria-label={`Sumar ${String(step).replace(".", ",")} a ${label}`} disabled={base === null} onClick={() => bump(1)}>
        +
      </button>
    </div>
  );
}
