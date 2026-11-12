import { useRef, useState } from "react";
import { exportBackup, importBackup } from "../db/db";
import { setMeasureNames } from "../db/actions";
import type { AppData } from "../db/useData";
import { todayISO } from "../lib/dates";
import { shareOrDownload } from "../lib/share";

const KEY = "gymlog:lastBackup";
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const write = (v: string) => {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* sin almacenamiento local: solo no se recuerda la fecha */
  }
};

export function SettingsScreen({ data }: { data: AppData }) {
  const [msg, setMsg] = useState("");
  const [lastBackup, setLastBackup] = useState(read());
  const [newMeasure, setNewMeasure] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const names = data.settings.measureNames;

  async function onExport() {
    const blob = new Blob([JSON.stringify(await exportBackup(), null, 1)], { type: "application/json" });
    const res = await shareOrDownload(blob, `gymlog-backup-${todayISO()}.json`, "Backup de GymLog");
    if (res !== "cancelled") {
      write(todayISO());
      setLastBackup(todayISO());
      setMsg(res === "downloaded" ? "Backup descargado." : "Backup compartido.");
    }
  }

  async function onImport(f: File | undefined) {
    if (!f) return;
    try {
      const text = await f.text();
      if (!window.confirm("Esto reemplaza TODOS los datos actuales por los del backup. ¿Seguir?")) return;
      await importBackup(text);
      setMsg("Backup restaurado.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo restaurar el backup.");
    } finally {
      if (file.current) file.current.value = "";
    }
  }

  function addMeasure() {
    const n = newMeasure.trim();
    if (!n || names.some((x) => x.toLowerCase() === n.toLowerCase())) return;
    setMeasureNames([...names, n]);
    setNewMeasure("");
  }

  return (
    <section>
      <header className="bar">
        <h1>Ajustes</h1>
      </header>

      <h2 className="sub">Medidas a registrar</h2>
      <ul className="list">
        {names.map((n) => (
          <li key={n} className="row">
            <div className="grow">{n}</div>
            <button className="ghost danger" onClick={() => window.confirm(`¿Dejar de pedir "${n}"? Lo ya cargado se conserva.`) && setMeasureNames(names.filter((x) => x !== n))}>
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <div className="addrow">
        <input aria-label="Nueva medida" placeholder="Ej.: Cadera, Brazo" value={newMeasure} onChange={(e) => setNewMeasure(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMeasure()} />
        <button className="primary" onClick={addMeasure}>
          Agregar
        </button>
      </div>

      <h2 className="sub">Backup</h2>
      <p className="hint">
        Tus datos viven solo en este celular. Si borrás los datos del navegador o cambiás de teléfono se pierden: guardá un backup de vez en cuando
        (por ejemplo, mandátelo por mail o WhatsApp). {lastBackup ? `Último backup: ${lastBackup}.` : "Todavía no hiciste ninguno."}
      </p>
      <div className="actions">
        <button className="primary" onClick={onExport}>
          Guardar backup
        </button>
        <button className="ghost" onClick={() => file.current?.click()}>
          Restaurar backup
        </button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
      </div>
      {msg && <p className="hint" role="status">{msg}</p>}
    </section>
  );
}
