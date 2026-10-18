import { assertEquals } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import { addRoute, getRoute, routes } from "./router.ts";
import {
  handleMcpRequest,
  isAuthorizedMcpRequest,
  mcpUnauthorizedResponse,
} from "./mcp.ts";

Deno.env.set("MCP_AUTH_TOKEN", "test-token-123");
Deno.env.set("INTERVALS_API_KEY", "test-icu-key");

routes.POST.length = 0;
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

function assertIncludes(haystack: string, needle: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`Expected "${needle}" in: ${haystack}`);
  }
}

Deno.test("MCP: unauthorized request returns 401 with WWW-Authenticate", async () => {
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
  }, false));
  assertEquals(res.status, 401);
  assertEquals(res.headers.get("WWW-Authenticate"), "Bearer");
  const data = await res.json();
  assertEquals(data.error.message, "Unauthorized");
});

Deno.test("MCP: wrong bearer token returns 401", async () => {
  const req = mcpRequest({ jsonrpc: "2.0", id: 1, method: "initialize" });
  const res = await getRoute(new Request(req, {
    headers: { ...Object.fromEntries(req.headers), Authorization: "Bearer wrong" },
  }));
  assertEquals(res.status, 401);
});

Deno.test("MCP: initialize returns server info and tools capability", async () => {
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
});

Deno.test("MCP: tools/list returns 4 tools with object schemas", async () => {
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
});

Deno.test("MCP: tools/call path traversal id rejected as tool error", async () => {
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
});

Deno.test("MCP: tools/call missing tool name returns -32602", async () => {
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { arguments: {} },
  }));
  const data = await res.json();
  assertEquals(data.error.code, -32602);
});

Deno.test("MCP: tools/call unknown tool returns error", async () => {
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "no_such_tool", arguments: {} },
  }));
  const data = await res.json();
  assertEquals(data.error.code, -32602);
  assertIncludes(data.error.message, "Unknown tool");
});

Deno.test("MCP: notification returns 202 with empty body", async () => {
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    method: "notifications/initialized",
  }));
  assertEquals(res.status, 202);
  assertEquals(await res.text(), "");
});

Deno.test("MCP: invalid JSON returns 400 with -32700", async () => {
  const res = await getRoute(mcpRequest("{not json"));
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error.code, -32700);
});

Deno.test("MCP: invalid request (missing method) returns -32600", async () => {
  const res = await getRoute(mcpRequest({ jsonrpc: "2.0", id: 6 }));
  const data = await res.json();
  assertEquals(data.error.code, -32600);
});

Deno.test("MCP: unknown method returns -32601", async () => {
  const res = await getRoute(mcpRequest({
    jsonrpc: "2.0",
    id: 7,
    method: "resources/list",
  }));
  const data = await res.json();
  assertEquals(data.error.code, -32601);
});

Deno.test("MCP: batch request returns array of responses", async () => {
  const res = await getRoute(mcpRequest([
    { jsonrpc: "2.0", id: 8, method: "tools/list" },
    { jsonrpc: "2.0", id: 9, method: "tools/list" },
  ]));
  const data = await res.json();
  assertEquals(Array.isArray(data), true);
  assertEquals(data.length, 2);
  assertEquals(data[0].id, 8);
  assertEquals(data[1].id, 9);
});

Deno.test("MCP: get_activities defaults oldest to 30 days ago", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl: string | null = null;
  const mockFetch = ((input: RequestInfo | URL) => {
    capturedUrl = String(input);
    return Promise.resolve(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as unknown as typeof fetch;
  globalThis.fetch = mockFetch;

  try {
    const res = await getRoute(mcpRequest({
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: { name: "get_activities", arguments: {} },
    }));
    const data = await res.json();
    assertEquals(data.result.isError, undefined);
    if (capturedUrl === null) {
      throw new Error("fetch was not called");
    }
    const url = new URL(capturedUrl);
    assertEquals(url.pathname, "/api/v1/athlete/me/activities");
    const oldest = url.searchParams.get("oldest");
    if (oldest === null) {
      throw new Error("oldest param missing");
    }
    const expected = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    assertEquals(oldest, expected);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("MCP: upstream fetch failure surfaces as MCP tool error", async () => {
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
});
