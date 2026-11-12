// Genera los íconos PNG de la PWA a partir de las mismas formas que public/icon.svg (sin dependencias).
// Uso: node scripts/make-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BG = [15, 17, 21];
const FG = [52, 195, 143];
// Formas en el espacio 512x512: [x, y, ancho, alto, radio]
const SHAPES = [
  [96, 176, 52, 160, 14],
  [364, 176, 52, 160, 14],
  [156, 148, 40, 216, 12],
  [316, 148, 40, 216, 12],
  [196, 236, 120, 40, 8],
];

function inRoundRect(px, py, [x, y, w, h, r]) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function crc32(buf) {
  let c;
  let crc = ~0;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** `scale`: tamaño del dibujo respecto del lienzo; `rounded`: esquinas redondeadas del fondo (los maskable van a sangre). */
function render(size, scale, rounded) {
  const SS = 3; // supersampling para suavizar bordes
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cornerR = (112 / 512) * size;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let fg = 0;
      let inside = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS;
          const fy = y + (sy + 0.5) / SS;
          if (!rounded || inRoundRect(fx, fy, [0, 0, size, size, cornerR])) inside++;
          const u = ((fx / size - 0.5) / scale + 0.5) * 512;
          const v = ((fy / size - 0.5) / scale + 0.5) * 512;
          if (SHAPES.some((s) => inRoundRect(u, v, s))) fg++;
        }
      }
      const n = SS * SS;
      const a = inside / n;
      const f = fg / n;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] * (1 - f) + FG[c] * f);
      raw[o + 3] = Math.round(a * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

writeFileSync("public/icon-192.png", render(192, 1, true));
writeFileSync("public/icon-512.png", render(512, 1, true));
// Maskable: fondo a sangre y dibujo dentro de la zona segura (80 %).
writeFileSync("public/icon-maskable-512.png", render(512, 0.7, false));
console.log("Íconos generados en public/");
