import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = "https://sholiday.faboul.se/dagar/v2.1";

type DayRecord = Record<string, unknown>;

async function fetchDay(y: number, m: number, d: number): Promise<DayRecord> {
  const path = `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
  const res = await fetch(`${BASE}/${path}`);
  assert.ok(res.ok, `HTTP ${res.status} for ${path}`);
  const body = await res.json() as { dagar: DayRecord[] };
  assert.ok(Array.isArray(body.dagar) && body.dagar.length > 0, "dagar array missing");
  return body.dagar[0]!;
}

async function fetchMonth(y: number, m: number): Promise<DayRecord[]> {
  const path = `${y}/${String(m).padStart(2, "0")}`;
  const res = await fetch(`${BASE}/${path}`);
  assert.ok(res.ok, `HTTP ${res.status} for ${path}`);
  const body = await res.json() as { dagar: DayRecord[] };
  return body.dagar;
}

// Response shape

test("api: day response has required fields", async () => {
  const day = await fetchDay(2026, 5, 27);
  for (const field of ["datum", "veckodag", "vecka", "dag i vecka", "arbetsfri dag", "röd dag", "namnsdag", "flaggdag"]) {
    assert.ok(field in day, `missing field: ${field}`);
  }
});

test("api: namnsdag is always an array", async () => {
  const day = await fetchDay(2026, 5, 27);
  assert.ok(Array.isArray(day["namnsdag"]), "namnsdag should be an array");
});

// Known public holidays

test("api: Christmas Day 2024 is a red day (röd dag = Ja)", async () => {
  const day = await fetchDay(2024, 12, 25);
  assert.equal(day["röd dag"], "Ja");
  assert.equal(day["helgdag"], "Juldagen");
});

test("api: Swedish National Day 2024-06-06 is a red day with a flag day", async () => {
  const day = await fetchDay(2024, 6, 6);
  assert.equal(day["röd dag"], "Ja");
  assert.ok(typeof day["flaggdag"] === "string" && day["flaggdag"].length > 0, "flaggdag should be non-empty");
});

test("api: New Year's Eve is a named helgdag, not a red day", async () => {
  const day = await fetchDay(2024, 12, 31);
  assert.equal(day["röd dag"], "Nej");
  assert.equal(day["helgdag"], "Nyårsafton");
});

test("api: Midsummer Eve 2025 is a named helgdag, not a red day", async () => {
  const day = await fetchDay(2025, 6, 20);
  assert.equal(day["röd dag"], "Nej");
  assert.equal(day["helgdag"], "Midsommarafton");
});

test("api: Pingstafton 2025 carries the helgdagsafton field", async () => {
  const day = await fetchDay(2025, 6, 7);
  assert.equal(day["röd dag"], "Nej");
  assert.equal(day["helgdagsafton"], "Pingstafton");
});

// Month endpoint

test("api: May has 31 days", async () => {
  const days = await fetchMonth(2026, 5);
  assert.equal(days.length, 31);
});

test("api: February 2024 (leap year) has 29 days", async () => {
  const days = await fetchMonth(2024, 2);
  assert.equal(days.length, 29);
});

test("api: February 2025 (non-leap year) has 28 days", async () => {
  const days = await fetchMonth(2025, 2);
  assert.equal(days.length, 28);
});
