# GymLog

Registro personal de pesos del gym, peso corporal y medidas, con PDF semanal para la nutricionista.
PWA: se instala en el celular desde Chrome y los datos quedan en el propio teléfono.

## Cómo se usa
1. **Entrenar**: arriba ves la semana (L a D) con los días que entrenaste en color; tocás un día para
   cargarlo. Elegís el día de la rutina (el día 4 muestra solo el de la semana: pierna u hombro), marcás
   que lo hiciste y anotás el peso máximo de cada ejercicio. Se guarda solo.
2. **Cuerpo**: peso corporal y medidas (cintura por defecto; se pueden agregar más en Ajustes).
3. **Semana**: calendario de semanas y días (cada día de la rutina tiene su color). Tocás una semana,
   o dos para un rango, y ves el resumen (días entrenados, promedio de peso, máximo de cada ejercicio).
   **Compartir PDF** arma un solo archivo con una hoja por semana y abre el menú de Android (WhatsApp,
   mail…). **Rango libre** deja mirar de cualquier fecha a cualquier fecha (por ejemplo, miércoles a
   miércoles), solo para consultar. Tocar un día abre su detalle.
4. **Rutina**: agregar, renombrar, reordenar o quitar días y ejercicios. Lo quitado se conserva en el historial.
5. **Ajustes**: medidas a registrar y **backup** (guardar/restaurar un JSON).

> Los datos viven solo en el celular. Hacé un backup de vez en cuando.

## Desarrollo
```bash
pnpm install
pnpm dev       # http://localhost:5173
pnpm test
pnpm build     # PWA en dist/
```

## Instalarla en el celular
Una PWA solo se instala desde una dirección `https`, así que hay que publicar el contenido de `dist/`
(Vercel, Cloudflare Pages o GitHub Pages sirven y son gratis). Después, en Chrome del celular:
menú ⋮ → **Instalar app**.
