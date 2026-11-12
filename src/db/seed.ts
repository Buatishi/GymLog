import type { Exercise, RoutineDay } from "../lib/types";

type Seed = { name: string; scheme: string; note?: string };

/** Rutina inicial tomada de "Rutinas gym.pdf". Todo se puede editar desde la app. */
const ROUTINE: { slot: number; name: string; variant: "A" | "B" | null; exercises: Seed[] }[] = [
  {
    slot: 1,
    name: "Espalda",
    variant: null,
    exercises: [
      { name: "Remo en T", scheme: "8-10 x 4" },
      { name: "Remo sentado", scheme: "8-10 x 4", note: "Buscar agarre cerrado" },
      { name: "Jalones al pecho", scheme: "8-10 x 3" },
      { name: "Pájaros", scheme: "10-12 x 3" },
      { name: "Pullover en polea", scheme: "12 x 3" },
      { name: "Curl bíceps martillo", scheme: "10-12 x 3" },
      { name: "Curl bíceps normal", scheme: "10-12 x 3" },
      { name: "Bíceps banco Scott", scheme: "12-15 x 2" },
    ],
  },
  {
    slot: 2,
    name: "Pecho y tríceps",
    variant: null,
    exercises: [
      { name: "Press plano (banco derecho)", scheme: "6-8 x 4", note: "Priorizar peso" },
      { name: "Press banca inclinado", scheme: "8-10 x 4" },
      { name: "Crossover en poleas", scheme: "10-12 x 3", note: "Que pese pero controlable" },
      { name: "Empuje de pecho en máquina", scheme: "10-12 x 3" },
      { name: "Extensión de tríceps con polea", scheme: "8-10 x 3", note: "Biserie combinada" },
      { name: "Extensión de tríceps por encima de la cabeza", scheme: "8-10 x 3", note: "Biserie combinada" },
    ],
  },
  {
    slot: 3,
    name: "Espalda y hombro",
    variant: null,
    exercises: [
      { name: "Jalón al pecho abierto", scheme: "8-10 x 3" },
      { name: "Remo sentado unilateral", scheme: "10-12 x 3" },
      { name: "Peck deck espalda", scheme: "12-15 x 2 o 3" },
      { name: "Press militar", scheme: "6-8 x 3" },
      { name: "Elevaciones laterales en polea (unilateral)", scheme: "12-15 x 3" },
      { name: "Pájaros", scheme: "12-15 x 3" },
    ],
  },
  {
    slot: 4,
    name: "Pierna y abs",
    variant: "A",
    exercises: [
      { name: "Sentadillas", scheme: "6-8 x 4" },
      { name: "Peso muerto", scheme: "6-8 x 4" },
      { name: "Prensa y gemelos", scheme: "8-10 x 3" },
      { name: "Sillón de cuádriceps", scheme: "12-15 x 3", note: "Hasta el fallo · hipertrofia" },
      { name: "Curl femoral", scheme: "12-15 x 3", note: "Hasta el fallo · hipertrofia" },
    ],
  },
  {
    slot: 4,
    name: "Hombro",
    variant: "B",
    exercises: [
      { name: "Press militar", scheme: "6-8 x 4", note: "Pesado" },
      { name: "Elevaciones laterales", scheme: "8-10 x 3" },
      { name: "Pájaros", scheme: "10-12 x 3" },
      { name: "Encogimientos", scheme: "8-10 x 4" },
      { name: "“No sé” con mancuernas", scheme: "12-15 x 3" },
    ],
  },
];

export function buildSeed(newId: () => string = () => crypto.randomUUID()): { days: RoutineDay[]; exercises: Exercise[] } {
  const days: RoutineDay[] = [];
  const exercises: Exercise[] = [];
  ROUTINE.forEach((d, i) => {
    const id = newId();
    days.push({ id, slot: d.slot, name: d.name, variant: d.variant, order: i, archived: false });
    d.exercises.forEach((e, j) => {
      exercises.push({ id: newId(), dayId: id, name: e.name, scheme: e.scheme, note: e.note ?? "", order: j, archived: false });
    });
  });
  return { days, exercises };
}
