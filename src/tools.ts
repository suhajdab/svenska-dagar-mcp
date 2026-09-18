export const TOOL_DEFINITIONS = [
  {
    name: "get_swedish_day",
    description:
      "Return Swedish calendar data for a single date: weekday name, week number, " +
      "whether it is a work-free day (arbetsfri dag), a red day (röd dag / public holiday), " +
      "a flag day (flaggdag), name days (namnsdag), holiday name (helgdag), " +
      "holiday eve (helgdagsafton), and squeeze day (klämdagen).",
    inputSchema: {
      type: "object" as const,
      properties: {
        year:  { type: "integer", description: "Year (1753–2100)" },
        month: { type: "integer", description: "Month (1–12)" },
        day:   { type: "integer", description: "Day of month (1–31)" },
      },
      required: ["year", "month", "day"],
      additionalProperties: false,
    },
  },
  {
    name: "get_swedish_month",
    description:
      "Return Swedish calendar data for every day in a calendar month. " +
      "Each day entry contains the same fields as get_swedish_day.",
    inputSchema: {
      type: "object" as const,
      properties: {
        year:  { type: "integer", description: "Year (1753–2100)" },
        month: { type: "integer", description: "Month (1–12)" },
      },
      required: ["year", "month"],
      additionalProperties: false,
    },
  },
  {
    name: "get_swedish_year",
    description:
      "Return Swedish calendar data for every day in a calendar year (~365 records). " +
      "Prefer get_swedish_month when only a subset of the year is needed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        year: { type: "integer", description: "Year (1753–2100)" },
      },
      required: ["year"],
      additionalProperties: false,
    },
  },
];
