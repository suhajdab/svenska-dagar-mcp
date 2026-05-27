export function validateYear(year: unknown): asserts year is number {
  if (!Number.isInteger(year) || (year as number) < 1753 || (year as number) > 2100) {
    throw new Error(`year must be an integer between 1753 and 2100, got ${year}`);
  }
}

export function validateMonth(month: unknown): asserts month is number {
  if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) {
    throw new Error(`month must be an integer between 1 and 12, got ${month}`);
  }
}

export function validateDay(day: unknown): asserts day is number {
  if (!Number.isInteger(day) || (day as number) < 1 || (day as number) > 31) {
    throw new Error(`day must be an integer between 1 and 31, got ${day}`);
  }
}
