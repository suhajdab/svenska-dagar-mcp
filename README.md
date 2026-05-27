# @onereason/svenska-dagar-mcp

MCP server exposing the Swedish public holiday and calendar API ([sholiday.faboul.se](https://sholiday.faboul.se)) to Claude and other MCP clients.

## Installation

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "svenska-dagar": {
      "command": "npx",
      "args": ["-y", "@onereason/svenska-dagar-mcp"]
    }
  }
}
```

Restart Claude Desktop. The three tools below are then available in every conversation.

## Tools

### `get_swedish_day`

Returns calendar data for a single date.

| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | integer | Year (1753–2100) |
| `month` | integer | Month (1–12) |
| `day` | integer | Day of month (1–31) |
| `sanitize` | boolean | See [Security](#security) — default `true` |

### `get_swedish_month`

Returns calendar data for every day in a month.

| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | integer | Year (1753–2100) |
| `month` | integer | Month (1–12) |
| `sanitize` | boolean | Default `true` |

### `get_swedish_year`

Returns calendar data for every day in a year (~365 records). Prefer `get_swedish_month` when only a subset is needed.

| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | integer | Year (1753–2100) |
| `sanitize` | boolean | Default `true` |

## Response fields

Each day record contains:

| Field | Type | Description |
|-------|------|-------------|
| `datum` | string | Date (`YYYY-MM-DD`) |
| `veckodag` | string | Weekday name in Swedish |
| `vecka` | string | ISO week number |
| `dag i vecka` | string | Day of week (1 = Monday) |
| `arbetsfri dag` | `"Ja"` \| `"Nej"` | Work-free day |
| `röd dag` | `"Ja"` \| `"Nej"` | Public holiday (red day) |
| `namnsdag` | string[] | Name days (namnsdagar) |
| `flaggdag` | string | Flag day name, or `""` |
| `helgdag` | string | Holiday or named eve (e.g. `"Juldagen"`, `"Nyårsafton"`) — present only when applicable |
| `helgdagsafton` | string | Eve before a red day (e.g. `"Pingstafton"`) — present only when applicable |
| `klämdagen` | `"Ja"` | Squeeze day (klämdagen) — present only when applicable |
| `dag före arbetsfri helgdag` | `"Ja"` | Day before a work-free holiday — present only when applicable |

## Security

All responses are sanitized before reaching the LLM by default:

- **Field allowlist** — unknown fields are dropped
- **Injection scan** — string values are checked against known prompt-injection patterns (ChatML tokens, role prefixes, markdown headers, etc.) and replaced with `[redacted: suspicious content]` if matched
- **Length cap** — strings longer than 100 characters are redacted
- **Enum coercion** — `"röd dag"` and `"arbetsfri dag"` are coerced to exactly `"Ja"` or `"Nej"`
- **Hardcoded flags** — presence-only fields (`klämdagen`, `dag före arbetsfri helgdag`) are always written as `"Ja"` regardless of what the API sends
- **Non-object responses** — if the upstream returns a string, array, or any non-object, an empty safe structure is returned instead of passing through raw content

Pass `sanitize: false` to receive the raw upstream response (useful for debugging).

## Development

```bash
npm install        # install dependencies
npm run build      # compile TypeScript → dist/
npm test           # run unit + integration tests (requires network for API tests)
```

**Running the server** requires Node.js ≥ 18 (native `fetch`).  
**Running the tests** requires Node.js ≥ 22.6 (`--experimental-strip-types`).

## License

MIT
