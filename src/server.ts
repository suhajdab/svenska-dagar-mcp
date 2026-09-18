#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { validateYear, validateMonth, validateDay } from "./validate.js";
import {
  RESPONSE_DAY_LIMITS,
  serializeCalendarResponse,
} from "./sanitize.js";
import { fetchCalendar } from "./upstream.js";
import { TOOL_DEFINITIONS } from "./tools.js";

// ---------------------------------------------------------------------------
// MCP server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "svenska-dagar", version: "0.2.1" },
  { capabilities: { tools: {} } },
);

// Tool descriptions are static strings — no API data is embedded in them.
server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [...TOOL_DEFINITIONS],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  const { year, month, day } = args as Record<string, unknown>;

  try {
    let data: unknown;
    let dayLimits: { min: number; max: number };

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
      dayLimits = RESPONSE_DAY_LIMITS.day;
    } else if (name === "get_swedish_month") {
      validateYear(year);
      validateMonth(month);
      const y = year as number;
      const m = month as number;
      data = await fetchCalendar(`${y}/${String(m).padStart(2, "0")}`);
      dayLimits = RESPONSE_DAY_LIMITS.month;
    } else if (name === "get_swedish_year") {
      validateYear(year);
      data = await fetchCalendar(String(year as number));
      dayLimits = RESPONSE_DAY_LIMITS.year;
    } else {
      throw new Error(`unknown tool: ${name}`);
    }

    return {
      content: [{
        type: "text",
        text: serializeCalendarResponse(data, dayLimits),
      }],
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
