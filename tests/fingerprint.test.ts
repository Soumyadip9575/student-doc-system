import { describe, it, expect } from "vitest";
import { fingerprint, detectIdColumn } from "../src/lib/fingerprint";

describe("fingerprint", () => {
  const h = ["Timestamp", "Student Name", "Student ID"];
  it("is deterministic and keyed on student ID, not name/timestamp", () => {
    const col = detectIdColumn(h);
    const a = fingerprint("s1", { Timestamp: "1", "Student Name": "A", "Student ID": "X1" }, col);
    const b = fingerprint("s1", { Timestamp: "2", "Student Name": "A2", "Student ID": "x1" }, col);
    expect(a).toBe(b);
  });
  it("differs per student and per sheet", () => {
    expect(fingerprint("s1", { "Student ID": "1" }, "Student ID")).not.toBe(fingerprint("s1", { "Student ID": "2" }, "Student ID"));
    expect(fingerprint("s1", { "Student ID": "1" }, "Student ID")).not.toBe(fingerprint("s2", { "Student ID": "1" }, "Student ID"));
  });
});
