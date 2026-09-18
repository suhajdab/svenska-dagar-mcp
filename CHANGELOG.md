# Changelog

## 0.2.1

- Reduce the upstream response limit from 1 MB to 256 KiB.
- Bound responses to 1 day, 31 month records, or 366 year records.
- Reject invalid day records and name-day lists with more than 10 entries.
- Cap sanitized output at 128 KiB to prevent response amplification.

## 0.2.0

- Require supported Node.js releases beginning with Node 22.
- Remove the model-controlled response-sanitization bypass.
- Reject redirects, non-JSON responses, and upstream payloads larger than 1 MB.
- Test on Node 22 and 24 and verify registry signatures in CI.
- Pin GitHub Actions to immutable commits and validate release tags before publish.

## 0.1.5

- Update `@modelcontextprotocol/sdk` to 1.30.0.
- Roll up patched transitive runtime dependencies.
- Align the MCP server's reported version with the npm package version.
