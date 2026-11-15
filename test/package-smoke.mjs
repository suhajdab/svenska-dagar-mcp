import assert from "node:assert/strict";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const project = process.argv[2];
assert.ok(project, "Pass the path to the project with the installed release");

const client = new Client({ name: "package-smoke", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: resolve(project, "node_modules/.bin/svenska-dagar-mcp"),
  cwd: project,
  stderr: "inherit",
});
const requestOptions = { timeout: 5_000 };

client.onerror = (error) => {
  console.error(error);
  process.exitCode = 1;
};

try {
  await client.connect(transport, requestOptions);
  assert.equal(client.getServerVersion()?.name, "svenska-dagar");

  const { tools } = await client.listTools(undefined, requestOptions);
  assert.ok(
    tools.some((tool) => tool.name === "get_swedish_day"),
    "Expected the installed server to advertise get_swedish_day",
  );
  console.log("Installed MCP server initialized and listed tools over stdio.");
} finally {
  await client.close();
}
