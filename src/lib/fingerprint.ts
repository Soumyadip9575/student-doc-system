import { createHash } from "crypto";
export type Row = Record<string, string>;

export function detectIdColumn(headers: string[]): string | undefined {
  return headers.find((h) => /(student|registration|reg|roll|enrol).*(id|no|number)?/i.test(h) && !/name|email|phone/i.test(h));
}

/** Deterministic identity: stable ID column if present, else hash of the whole row. Never name/row-number only. */
export function fingerprint(sheetId: string, row: Row, idCol?: string): string {
  const idVal = idCol ? row[idCol]?.trim().toLowerCase() : "";
  const key = idVal ? `id:${idVal}` : "h:" + JSON.stringify(Object.entries(row).sort());
  return createHash("sha256").update(`${sheetId}|${key}`).digest("hex");
}
