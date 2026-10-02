import { assertEquals } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import { addRoute, getRoute } from "./router.ts";
import {
  handleMcpRequest,
  isAuthorizedMcpRequest,
  mcpUnauthorizedResponse,
} from "./mcp.ts";

Deno.env.set("MCP_AUTH_TOKEN", "test-token-123");
Deno.env.set("INTERVALS_API_KEY", "test-icu-key");
Deno.env.set("INTERVALS_ATHELETE_ID", "12345");

addRoute("POST", "/mcp", (req) => {
  if (!isAuthorizedMcpRequest(req)) {
    return mcpUnauthorizedResponse();
  }
  return handleMcpRequest(req);
});

function mcpRequest(body: unknown, authorized = true) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authorized) {
    headers["Authorization"] = "Bearer test-token-123";
  }
  return new Request("http://localhost:8000/mcp", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// 1. Unauthorized request -> 401
{
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
  }, false));
  assertEquals(res.status, 401);
  assertEquals(res.headers.get("WWW-Authenticate"), "Bearer");
  const data = await res.json();
  assertEquals(data.error.message, "Unauthorized");
  console.log("✓ unauthorized request returns 401 with WWW-Authenticate");
}

// 2. Wrong token -> 401
{
  const req = mcpRequest({ jsonrpc: "2.0", id: 1, method: "initialize" });
  const res = await getRoute(new Request(req, {
    headers: { ...Object.fromEntries(req.headers), Authorization: "Bearer wrong" },
  }));
  assertEquals(res.status, 401);
  console.log("✓ wrong bearer token returns 401");
}

// 3. initialize
{
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-03-26" },
  }));
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.jsonrpc, "2.0");
  assertEquals(data.id, 1);
  assertEquals(data.result.protocolVersion, "2025-03-26");
  assertEquals(data.result.serverInfo.name, "deno-server-mcp");
  assertEquals(data.result.capabilities.tools, {});
  console.log("✓ initialize returns server info and tools capability");
}

// 4. tools/list
{
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  }));
  const data = await res.json();
  const names = data.result.tools.map((t: { name: string }) => t.name);
  assertEquals(names, ["get_athlete", "get_activities", "get_activity", "get_wellness"]);
  for (const tool of data.result.tools) {
    assertEquals(tool.inputSchema.type, "object");
  }
  console.log("✓ tools/list returns 4 tools with object schemas");
}

// 5. tools/call: path traversal id -> tool error (isError), no fetch attempted
{
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "get_activity",
      arguments: { id: "../athlete/12345/activities.csv" },
    },
  }));
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.result.isError, true);
  assertIncludes(data.result.content[0].text, "numeric activity id");
  console.log("✓ path traversal id rejected as tool error");
}

// 6. tools/call: missing tool name -> INVALID_PARAMS
{
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { arguments: {} },
  }));
  const data = await res.json();
  assertEquals(data.error.code, -32602);
  console.log("✓ missing tool name returns -32602");
}

// 7. tools/call: unknown tool -> error
{
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "no_such_tool", arguments: {} },
  }));
  const data = await res.json();
  assertEquals(data.error.code, -32602);
  assertIncludes(data.error.message, "Unknown tool");
  console.log("✓ unknown tool returns error");
}

// 8. notification -> 202 empty
{
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    method: "notifications/initialized",
  }));
  assertEquals(res.status, 202);
  assertEquals(await res.text(), "");
  console.log("✓ notification returns 202 with empty body");
}

// 9. invalid JSON -> 400 parse error
{
  const res = await getRoute(mcpRequest("{not json"));
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error.code, -32700);
  console.log("✓ invalid JSON returns 400 with -32700");
}

// 10. invalid request (missing method) -> -32600
{
  const res = await getRoute(mcpRequest({ jsonrpc: "2.0", id: 6 }));
  const data = await res.json();
  assertEquals(data.error.code, -32600);
  console.log("✓ invalid request returns -32600");
}

// 11. unknown method -> -32601
{
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 7,
    method: "resources/list",
  }));
  const data = await res.json();
  assertEquals(data.error.code, -32601);
  console.log("✓ unknown method returns -32601");
}

// 12. batch request -> array response
{
  const res = await getRoute(mcpRequest([
    { jsonrpc: "2.0", id: 8, method: "tools/list" },
    { jsonrpc: "2.0", id: 9, method: "tools/list" },
  ]));
  const data = await res.json();
  assertEquals(Array.isArray(data), true);
  assertEquals(data.length, 2);
  assertEquals(data[0].id, 8);
  assertEquals(data[1].id, 9);
  console.log("✓ batch request returns array of responses");
}

// 13. tools/call with upstream fetch (get_athlete) -> tool error with status
// (upstream is unreachable/mocked key, so intervalsFetch throws and the
// handler converts it to an isError result)
{
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 10,
    method: "tools/call",
    params: { name: "get_athlete", arguments: {} },
  }));
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.result.isError, true);
  assertIncludes(data.result.content[0].text, "get_athlete");
  console.log("✓ upstream fetch failure surfaces as MCP tool error");
}

function assertIncludes(haystack: string, needle: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`Expected "${needle}" in: ${haystack}`);
  }
}

console.log("\nAll 13 MCP endpoint tests passed");
