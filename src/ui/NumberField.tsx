import { useEffect, useRef, useState } from "react";

/** "85,5" o "85.5" → 85.5. Vacío → null. Texto inválido → undefined. */
export function parseNumber(text: string, max = 1000): number | null | undefined {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  const n = Number(t);
  return n > 0 && n <= max ? n : undefined;
}

interface Props {
  value: number | null;
  onCommit: (n: number | null) => void;
  placeholder?: string;
  unit?: string;
  label: string;
  max?: number;
}

/** Campo numérico que guarda solo (a los 0,4 s sin escribir y al salir del campo). */
export function NumberField({ value, onCommit, placeholder, unit, label, max }: Props) {
  const [text, setText] = useState(value === null ? "" : String(value).replace(".", ","));
  const committed = useRef(value);
  const timer = useRef<number | undefined>(undefined);
  const bad = parseNumber(text, max) === undefined;

  function commit(t: string) {
    const n = parseNumber(t, max);
    if (n === undefined || n === committed.current) return;
    committed.current = n;
    onCommit(n);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <label className={`num${bad ? " bad" : ""}`}>
      <input
        aria-label={label}
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder ?? "—"}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          window.clearTimeout(timer.current);
          const t = e.target.value;
          timer.current = window.setTimeout(() => commit(t), 400);
        }}
        onBlur={() => {
          window.clearTimeout(timer.current);
          commit(text);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        onFocus={(e) => e.currentTarget.select()}
      />
      {unit && <span>{unit}</span>}
    </label>
  );
}
