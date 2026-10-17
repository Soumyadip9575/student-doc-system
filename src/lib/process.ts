import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { detectIdColumn } from "./fingerprint";
import { buildPdf } from "./pdf";
import { sendDocs } from "./email";

const CHUNK = 10;
type Row = Record<string, string>;

export async function processFormSubmissions(formId: string, recipient: string, userEmail?: string | null) {
  const form = await db.appForm.findUnique({ where: { id: formId }, select: { id: true, title: true } });
  if (!form) throw new Error("Form not found.");
  const submissions = await db.formSubmission.findMany({ where: { formId, processedAt: null }, orderBy: { submittedAt: "asc" } });
  if (!submissions.length) throw new Error("There are no new responses to process.");

  const batch = await db.processingBatch.create({ data: { sheetId: `form:${form.id}`, recipient, total: submissions.length } });
  await db.auditLog.create({ data: { userEmail, action: "FORM_BATCH_STARTED", metadata: { batchId: batch.id, formId, title: form.title } } });

  const claimed: { deliveryId: string; submissionId: string; row: Row }[] = [];
  let skipped = 0;
  for (const submission of submissions) {
    const row = submission.data as Row;
    const fingerprint = createHash("sha256").update(`${formId}|${submission.id}`).digest("hex");
    const headers = Object.keys(row);
    const idColumn = detectIdColumn(headers);
    const nameColumn = headers.find((header) => /name/i.test(header));
    const emailColumn = headers.find((header) => /e-?mail/i.test(header));
    const record = await db.studentRecord.upsert({
      where: { fingerprint }, update: {},
      create: {
        fingerprint, sheetId: `form:${formId}`, rawData: row,
        studentId: idColumn ? row[idColumn] : null,
        name: nameColumn ? row[nameColumn] : null,
        email: emailColumn ? row[emailColumn] : null,
      },
    });
    try {
      const delivery = await db.delivery.create({ data: { recordId: record.id, status: "PROCESSING", recipient, batchId: batch.id } });
      claimed.push({ deliveryId: delivery.id, submissionId: submission.id, row });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      const retry = await db.delivery.updateMany({
        where: { recordId: record.id, purpose: "STUDENT_DOC", status: "FAILED" },
        data: { status: "PROCESSING", batchId: batch.id, recipient, error: null },
      });
      if (retry.count === 1) {
        const delivery = await db.delivery.findFirstOrThrow({ where: { recordId: record.id, purpose: "STUDENT_DOC" } });
        claimed.push({ deliveryId: delivery.id, submissionId: submission.id, row });
      } else {
        skipped++;
        const previous = await db.delivery.findFirst({ where: { recordId: record.id, purpose: "STUDENT_DOC", status: "SENT" }, select: { id: true } });
        if (previous) await db.formSubmission.update({ where: { id: submission.id }, data: { processedAt: new Date() } });
      }
    }
  }

  let sent = 0, failed = 0;
  for (let index = 0; index < claimed.length; index += CHUNK) {
    const group = claimed.slice(index, index + CHUNK);
    const built: { id: string; submissionId: string; ref: string; hash: string; file: { filename: string; content: Buffer } }[] = [];
    for (const item of group) {
      try {
        const pdf = await buildPdf(item.row);
        built.push({ id: item.deliveryId, submissionId: item.submissionId, ref: pdf.docRef, hash: pdf.hash, file: { filename: `${pdf.docRef}.pdf`, content: Buffer.from(pdf.bytes) } });
      } catch {
        failed++;
        await db.delivery.update({ where: { id: item.deliveryId }, data: { status: "FAILED", error: "PDF_GENERATION_FAILED" } });
      }
    }
    if (!built.length) continue;
    try {
      await sendDocs(recipient, built.map((item) => item.file));
      for (const item of built) {
        await db.delivery.update({ where: { id: item.id }, data: { status: "SENT", docRef: item.ref, docHash: item.hash, sentAt: new Date() } });
        await db.formSubmission.update({ where: { id: item.submissionId }, data: { processedAt: new Date() } });
      }
      sent += built.length;
    } catch {
      failed += built.length;
      for (const item of built) await db.delivery.update({ where: { id: item.id }, data: { status: "FAILED", error: "EMAIL_FAILED" } });
    }
  }

  await db.processingBatch.update({ where: { id: batch.id }, data: { skipped, sent, failed, status: failed ? "COMPLETED_WITH_ERRORS" : "COMPLETED", completedAt: new Date() } });
  await db.auditLog.create({ data: { userEmail, action: "FORM_BATCH_COMPLETED", metadata: { batchId: batch.id, formId, sent, failed, skipped } } });
  return { batchId: batch.id, total: submissions.length, alreadyProcessed: skipped, newDocuments: claimed.length, sent, failed, demo: process.env.DEMO_MODE === "true" };
}
