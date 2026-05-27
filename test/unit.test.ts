import { test } from "node:test";
import assert from "node:assert/strict";
import { validateYear, validateMonth, validateDay } from "../src/validate.ts";

// --- validateYear ---

test("validateYear: accepts lower bound 1753", () => {
  assert.doesNotThrow(() => validateYear(1753));
});

test("validateYear: accepts upper bound 2100", () => {
  assert.doesNotThrow(() => validateYear(2100));
});

test("validateYear: accepts midrange year", () => {
  assert.doesNotThrow(() => validateYear(2026));
});

test("validateYear: rejects 1752 (one below lower bound)", () => {
  assert.throws(() => validateYear(1752), /1753/);
});

test("validateYear: rejects 2101 (one above upper bound)", () => {
  assert.throws(() => validateYear(2101), /2100/);
});

test("validateYear: rejects float", () => {
  assert.throws(() => validateYear(2024.5));
});

test("validateYear: rejects string", () => {
  assert.throws(() => validateYear("2024"));
});

test("validateYear: rejects undefined", () => {
  assert.throws(() => validateYear(undefined));
});

// --- validateMonth ---

test("validateMonth: accepts lower bound 1", () => {
  assert.doesNotThrow(() => validateMonth(1));
});

test("validateMonth: accepts upper bound 12", () => {
  assert.doesNotThrow(() => validateMonth(12));
});

test("validateMonth: rejects 0 (below lower bound)", () => {
  assert.throws(() => validateMonth(0), /1/);
});

test("validateMonth: rejects 13 (above upper bound)", () => {
  assert.throws(() => validateMonth(13), /12/);
});

test("validateMonth: rejects float", () => {
  assert.throws(() => validateMonth(6.5));
});

test("validateMonth: rejects string", () => {
  assert.throws(() => validateMonth("6"));
});

// --- validateDay ---

test("validateDay: accepts lower bound 1", () => {
  assert.doesNotThrow(() => validateDay(1));
});

test("validateDay: accepts upper bound 31", () => {
  assert.doesNotThrow(() => validateDay(31));
});

test("validateDay: rejects 0 (below lower bound)", () => {
  assert.throws(() => validateDay(0), /1/);
});

test("validateDay: rejects 32 (above upper bound)", () => {
  assert.throws(() => validateDay(32), /31/);
});

test("validateDay: rejects float", () => {
  assert.throws(() => validateDay(15.9));
});

test("validateDay: rejects null", () => {
  assert.throws(() => validateDay(null));
});
