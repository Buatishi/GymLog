import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatShort, formatWithWeekday } from "./dates";
import { fmt, fmtDelta } from "./format";
import type { WeekReport } from "./weekly";

const INK: [number, number, number] = [24, 28, 36];
const MUTED: [number, number, number] = [110, 116, 128];
const ACCENT: [number, number, number] = [22, 128, 94];

function nextY(doc: jsPDF, fallback: number): number {
  const last = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  return last?.finalY ?? fallback;
}

function heading(doc: jsPDF, text: string, y: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 50) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(text, 14, y);
  return y + 3;
}

/** Dibuja el resumen de un período a partir de la página actual del documento. */
function drawReport(doc: jsPDF, report: WeekReport, ownerName: string): void {
  const tableStyle = {
    theme: "grid" as const,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 2.2, textColor: INK, lineColor: [220, 223, 228] as [number, number, number] },
    headStyles: { fillColor: ACCENT, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const },
    margin: { left: 14, right: 14 },
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text("Seguimiento semanal", 14, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  const year = report.end.slice(0, 4);
  doc.text(`Semana del ${formatShort(report.start)} al ${formatShort(report.end)} de ${year}${ownerName ? ` - ${ownerName}` : ""}`, 14, 27);
  doc.text(`Días de entrenamiento: ${report.trainedDays}`, 14, 33);

  // Peso corporal
  let y = heading(doc, "Peso corporal", 44);
  if (report.weights.length) {
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [["Fecha", "Peso"]],
      body: report.weights.map((w) => [formatWithWeekday(w.date), fmt(w.weightKg, "kg")]),
      columnStyles: { 1: { halign: "right" } },
      tableWidth: 90,
    });
    y = nextY(doc, y) + 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(
      `Promedio de la semana: ${fmt(report.avgWeight, "kg")}   |   Semana anterior: ${fmt(report.previousAvgWeight, "kg")}   |   Diferencia: ${fmtDelta(report.weightDelta, "kg")}`,
      14,
      y,
    );
    y += 9;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("Sin pesajes esta semana.", 14, y + 5);
    y += 12;
  }

  // Medidas
  const withData = report.measures.filter((m) => m.value !== null);
  if (withData.length) {
    y = heading(doc, "Medidas", y);
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [["Medida", "Esta semana", "Última anterior", "Diferencia"]],
      body: withData.map((m) => [m.name, fmt(m.value, "cm"), fmt(m.previous, "cm"), fmtDelta(m.delta, "cm")]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    });
    y = nextY(doc, y) + 9;
  }

  // Pesos del gym
  y = heading(doc, "Pesos del gym (máximo de la semana)", y);
  if (!report.blocks.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("Sin entrenamientos registrados esta semana.", 14, y + 5);
  }
  for (const block of report.blocks) {
    y += 4;
    // Cada día se mantiene entero: si no entra en lo que queda de la hoja, arranca en la siguiente.
    const needed = 9 * (block.rows.length + 2);
    if (y + needed > doc.internal.pageSize.getHeight() - 14 && needed < doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 16;
    }
    const label =`Día ${block.day.slot} - ${block.day.name}`;
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [[{ content: label, colSpan: 5, styles: { halign: "left" } }], ["Ejercicio", "Series x reps", "Peso", "Anterior", "Dif."]],
      body: block.rows.map((r) => [
        r.exercise.note ? `${r.exercise.name} (${r.exercise.note})` : r.exercise.name,
        r.exercise.scheme,
        fmt(r.max, "kg"),
        fmt(r.previous, "kg"),
        fmtDelta(r.delta),
      ]),
      columnStyles: { 1: { cellWidth: 30 }, 2: { halign: "right", cellWidth: 24, fontStyle: "bold" }, 3: { halign: "right", cellWidth: 24 }, 4: { halign: "right", cellWidth: 18 } },
      didParseCell: (data) => {
        // La segunda fila del encabezado es la de columnas: más sobria que la del título del día.
        if (data.section === "head" && data.row.index === 1) {
          data.cell.styles.fillColor = [236, 240, 243];
          data.cell.styles.textColor = INK;
        }
      },
    });
    y = nextY(doc, y) + 4;
  }
}

/** Un PDF con una sección por período, en el orden recibido (una página nueva por cada uno). */
export function buildWeeksPdf(reports: WeekReport[], ownerName = ""): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  reports.forEach((r, i) => {
    if (i > 0) doc.addPage();
    drawReport(doc, r, ownerName);
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`GymLog - página ${i} de ${pages}`, 14, h - 8);
  }
  return doc;
}

export function buildWeekPdf(report: WeekReport, ownerName = ""): jsPDF {
  return buildWeeksPdf([report], ownerName);
}

export function weekPdfFilename(report: WeekReport): string {
  return `seguimiento-semana-${report.start}.pdf`;
}

export function weeksPdfFilename(reports: WeekReport[]): string {
  const first = reports[0];
  const last = reports[reports.length - 1];
  if (!first || !last || reports.length === 1) return first ? weekPdfFilename(first) : "seguimiento.pdf";
  return `seguimiento-${first.start}-a-${last.end}.pdf`;
}
