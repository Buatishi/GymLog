# AGENTS.md — GymLog

App personal (un solo usuario) para registrar los pesos del gym, el peso corporal y las medidas, y
armar cada semana un PDF para la nutricionista. Se usa desde el celular, instalada como PWA.

## Decisiones aprobadas
- **PWA** (Vite + React + TypeScript estricto), no app nativa ni Play Store: instalable desde Chrome,
  abre a pantalla completa y funciona sin internet.
- **Datos en el celular** (IndexedDB vía Dexie), sin servidor ni login. Backup manual en JSON
  (exportar/importar) para no perder datos si se borra el navegador o se cambia de teléfono.
- **PDF en el dispositivo** (jsPDF + jspdf-autotable), compartido con el menú de Android o descargado.
  jsPDF se carga recién al generar el PDF (`import()` dinámico) para que la app abra rápido.
- **Rutina 100 % editable** (días, ejercicios, series x reps, notas). La rutina inicial sale de
  `src/db/seed.ts`; después manda lo que el usuario edite.
- **Día 4 alterna** semana por medio entre dos días (Pierna y abs / Hombro): `variant` A/B +
  `variantAnchor` en los ajustes. Ver `src/lib/variants.ts`.
- **Reporte semanal**: semana de lunes a domingo; por ejercicio va el **máximo de la semana** sin
  decir qué día. La comparación es con la última semana que tuvo dato (por la alternancia).

- **Entrenar**: tira de la semana (L a D) con un color por número de día de la rutina; los chips de
  día muestran si y cuándo se hizo cada día esa semana. La fecha elegida vive en `App` y se comparte
  con la pestaña Semana ("Editar este día").
- **Cuerpo**: misma tira de la semana que Entrenar, con dos marcas por día (peso y medidas). El plan
  pide pesarse y medirse 1 o 2 veces por semana, así que el estado se mira por semana (`bodyWeekRows`):
  "✓ n" o "Pendiente". Carga con botones −/+ (0,1 kg y 0,5 cm) que parten del último valor conocido.
  La fecha elegida es la misma que en Entrenar (estado en `App`); no hay selector de fecha en el encabezado.
- **Semana** (inspirada en HabitKit): calendario de semanas × días; se elige una semana o un rango de
  semanas con toques, y un **rango libre** (p. ej. miércoles a miércoles) para mirar. El PDF sale de
  semanas completas (una hoja por semana); el rango libre es solo de consulta. Tocar un día abre su
  detalle (`DaySheet`).
- `buildRangeReport(start, end)` es la base de todos los resúmenes; el "anterior" se mide con ventanas
  del mismo largo hacia atrás.

## Pendientes pedidos por el usuario (sin hacer)
- Revisar el **diseño y contenido del PDF** (el usuario lo pidió para después de estos cambios).

## Opciones exploradas y NO aprobadas
- Supabase / sincronización entre dispositivos: no hace falta para un solo celular. Se puede sumar
  después si se pide.
- Catálogo de ejercicios con imágenes (`yuhonas/free-exercise-db`, dominio público): no incluido; los
  nombres están en inglés y no coinciden con los de la rutina. Posible selector opcional a futuro.

## Reglas de trabajo
- Español en la conversación y en los textos de la app; identificadores y nombres de archivo en inglés.
- Explicar brevemente el porqué antes de cambios importantes. Nada de acciones externas (deploy,
  publicar, pushear) sin confirmación.
- TypeScript estricto, sin `any`. Todo comportamiento nuevo necesita test.
- Sin trailers de coautoría de IA en commits ni PRs.
- Formatear/modificar solo los archivos que se tocan.

## Comandos
```bash
pnpm dev          # servidor local
pnpm test         # vitest (lógica, base con fake-indexeddb, PDF)
pnpm build        # tsc + vite build (genera la PWA en dist/)
node scripts/make-icons.mjs   # regenera los íconos PNG
```

## Mapa
- `src/lib/` lógica pura y testeada: `dates`, `variants`, `weekly` (reportes por rango), `calendar`
  (celdas, selección de semanas), `dayDetail`, `pdf`, `backup`, `format`.
- `src/db/` Dexie (`db.ts`), semilla de la rutina (`seed.ts`), escrituras (`actions.ts`), `useData`.
- `src/ui/` una pantalla por pestaña: Entrenar, Cuerpo, Semana, Rutina, Ajustes.

## Windows
- `python` suelto es el alias de la Tienda; usar `python3`.
- Los heredocs largos con comillas mezcladas pueden fallar en Bash: crear archivos con la herramienta
  Write.
