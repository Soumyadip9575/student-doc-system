import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createHash, randomBytes } from "crypto";
import type { Row } from "./fingerprint";

const clean = (s: string, n = 95) => s.replace(/[^\x20-\x7E]/g, "?").slice(0, n);

export async function buildPdf(row: Row): Promise<{ bytes: Uint8Array; docRef: string; hash: string }> {
  const docRef = "DOC-" + new Date().getFullYear() + "-" + randomBytes(4).toString("hex").toUpperCase();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const orange = rgb(0.976, 0.451, 0.086), dark = rgb(0.07, 0.07, 0.07), gray = rgb(0.45, 0.45, 0.45);

  page.drawRectangle({ x: 0, y: 802, width: 595, height: 40, color: orange });
  page.drawText(clean(process.env.UNIVERSITY_NAME ?? "University", 60).toUpperCase(), { x: 40, y: 816, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText(clean(process.env.DEPARTMENT_NAME ?? "", 70), { x: 40, y: 770, size: 11, font, color: gray });
  page.drawText("STUDENT DOCUMENT", { x: 40, y: 740, size: 22, font: bold, color: dark });
  page.drawText(`Reference: ${docRef}`, { x: 40, y: 718, size: 10, font, color: gray });
  page.drawText(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`, { x: 300, y: 718, size: 10, font, color: gray });
  page.drawLine({ start: { x: 40, y: 705 }, end: { x: 555, y: 705 }, thickness: 1, color: orange });

  let y = 680;
  for (const [k, v] of Object.entries(row)) {
    if (y < 90) break;
    page.drawText(clean(k, 34), { x: 40, y, size: 10, font: bold, color: dark });
    page.drawText(clean(v || "-", 70), { x: 220, y, size: 10, font, color: dark });
    page.drawLine({ start: { x: 40, y: y - 8 }, end: { x: 555, y: y - 8 }, thickness: 0.4, color: rgb(0.9, 0.9, 0.9) });
    y -= 24;
  }
  page.drawText(`Digitally generated document  |  ID: ${docRef}`, { x: 40, y: 40, size: 8, font, color: gray });
  const bytes = await pdf.save();
  return { bytes, docRef, hash: createHash("sha256").update(bytes).digest("hex") };
}
