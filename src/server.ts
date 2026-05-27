#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { validateYear, validateMonth, validateDay } from "./validate.js";

// Hardcoded HTTPS base — callers cannot override the scheme or host.
const BASE_URL = "https://sholiday.faboul.se/dagar/v2.1" as const;
const TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// HTTP helper — path is always built from validated integers only.
// No JSONP callback parameter is ever used.
// ---------------------------------------------------------------------------

async function fetchCalendar(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/${path}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`upstream returned HTTP ${response.status}`);
    }
    return await response.json() as unknown;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// MCP server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "svenska-dagar", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

// Tool descriptions are static strings — no API data is embedded in them.
server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [
    {
      name: "get_swedish_day",
      description:
        "Return Swedish calendar data for a single date: weekday name, week number, " +
        "whether it is a work-free day (arbetsfri dag), a red day (röd dag / public holiday), " +
        "a flag day (flaggdag), name days (namnsdag), holiday name (helgdag), " +
        "holiday eve (helgdagsafton), and squeeze day (klämdagen).",
      inputSchema: {
        type: "object",
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
        type: "object",
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
        type: "object",
        properties: {
          year: { type: "integer", description: "Year (1753–2100)" },
        },
        required: ["year"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  const { year, month, day } = args as Record<string, unknown>;

  try {
    let data: unknown;

    if (name === "get_swedish_day") {
      validateYear(year);
      validateMonth(month);
      validateDay(day);
      const y = year as number;
      const m = month as number;
      const d = day as number;
      data = await fetchCalendar(
        `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`,
      );
    } else if (name === "get_swedish_month") {
      validateYear(year);
      validateMonth(month);
      const y = year as number;
      const m = month as number;
      data = await fetchCalendar(`${y}/${String(m).padStart(2, "0")}`);
    } else if (name === "get_swedish_year") {
      validateYear(year);
      data = await fetchCalendar(String(year as number));
    } else {
      throw new Error(`unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 0) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
