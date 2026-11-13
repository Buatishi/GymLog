import { useEffect, useState } from "react";
import { ensureSeed } from "./db/db";
import { todayISO } from "./lib/dates";
import { useData } from "./db/useData";
import { BodyScreen } from "./ui/BodyScreen";
import { RoutineScreen } from "./ui/RoutineScreen";
import { SettingsScreen } from "./ui/SettingsScreen";
import { TrainScreen } from "./ui/TrainScreen";
import { WeekScreen } from "./ui/WeekScreen";

type Tab = "train" | "body" | "week" | "routine" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "train", label: "Entrenar", icon: "M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12" },
  { id: "body", label: "Cuerpo", icon: "M12 4a2 2 0 1 0 0 .01M8 21l1.5-8L7 10h10l-2.5 3 1.5 8M9.5 13h5" },
  { id: "week", label: "Semana", icon: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4" },
  { id: "routine", label: "Rutina", icon: "M5 7h14M5 12h14M5 17h9" },
  { id: "settings", label: "Ajustes", icon: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("train");
  const [trainDate, setTrainDate] = useState(todayISO());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const data = useData();

  useEffect(() => {
    ensureSeed()
      .then(() => setReady(true))
      .catch(() => setError("No se pudo abrir la base de datos del navegador. Si estás en modo privado, abrí la app en una ventana normal."));
    // Pide que el navegador no borre los datos si falta espacio. Si no lo concede, no pasa nada.
    navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  if (error) return <main className="center">{error}</main>;
  if (!ready || !data) return <main className="center">Cargando…</main>;

  return (
    <>
      <main>
        {tab === "train" && <TrainScreen data={data} date={trainDate} setDate={setTrainDate} />}
        {tab === "body" && <BodyScreen data={data} />}
        {tab === "week" && <WeekScreen data={data} />}
        {tab === "routine" && <RoutineScreen data={data} />}
        {tab === "settings" && <SettingsScreen data={data} />}
      </main>
      <nav className="tabs" aria-label="Secciones">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}
