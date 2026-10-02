const INTERVALS_API_BASE = "https://intervals.icu/api/v1";
const MCP_PROTOCOL_VERSION = "2025-03-26";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
};

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

function jsonRpcResult(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function getIntervalsCredentials(): { apiKey: string; athleteId: string } | null {
  const apiKey = Deno.env.get("INTERVALS_ICU_API_KEY");
  const athleteId = Deno.env.get("INTERVALS_ICU_ATHLETE_ID");
  if (!apiKey || !athleteId) {
    return null;
  }
  return { apiKey, athleteId };
}

function expectString(
  params: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = params[name];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Parameter "${name}" must be a string`);
  }
  return value;
}

function buildQuery(
  params: Record<string, unknown>,
  entries: { param: string; query: string }[],
): string {
  const searchParams = new URLSearchParams();
  for (const { param, query } of entries) {
    const value = expectString(params, param);
    if (value !== undefined) {
      searchParams.set(query, value);
    }
  }
  return searchParams.toString();
}

function athletePath(suffix: string): string {
  const athleteId = Deno.env.get("INTERVALS_ICU_ATHLETE_ID");
  if (!athleteId) {
    throw new Error(
      "Missing INTERVALS_ICU_API_KEY or INTERVALS_ICU_ATHLETE_ID environment variable",
    );
  }
  return `/athlete/${athleteId}${suffix}`;
}

async function intervalsFetch(path: string, query = ""): Promise<unknown> {
  const credentials = getIntervalsCredentials();
  if (!credentials) {
    throw new Error(
      "Missing INTERVALS_ICU_API_KEY or INTERVALS_ICU_ATHLETE_ID environment variable",
    );
  }

  const authorization = `Basic ${btoa(`API_KEY:${credentials.apiKey}`)}`;
  const url = `${INTERVALS_API_BASE}${path}${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    headers: {
      "Authorization": authorization,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `intervals.icu request failed: ${response.status} ${response.statusText}${
        body ? `: ${body.slice(0, 500)}` : ""
      }`,
    );
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function textContent(payload: unknown) {
  return {
    content: [
      {
        type: "text",
        text: typeof payload === "string"
          ? payload
          : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (params: Record<string, unknown>) => Promise<unknown>;
};

const tools: ToolDefinition[] = [
  {
    name: "get_athlete",
    description:
      "Fetch the intervals.icu athlete profile for the configured athlete",
    inputSchema: { type: "object", properties: {} },
    handler: () => intervalsFetch(athletePath("")),
  },
  {
    name: "get_activities",
    description:
      "List activities for the configured athlete. Optionally filter by oldest/newest date (YYYY-MM-DD) and request specific fields",
    inputSchema: {
      type: "object",
      properties: {
        oldest: {
          type: "string",
          description: "Only include activities on or after this date (YYYY-MM-DD)",
        },
        newest: {
          type: "string",
          description: "Only include activities on or before this date (YYYY-MM-DD)",
        },
        fields: {
          type: "string",
          description: "Comma-separated list of activity fields to include",
        },
      },
    },
    handler: (params) => {
      const query = buildQuery(params, [
        { param: "oldest", query: "oldest" },
        { param: "newest", query: "newest" },
        { param: "fields", query: "fields" },
      ]);
      return intervalsFetch(athletePath("/activities"), query);
    },
  },
  {
    name: "get_activity",
    description:
      "Fetch a single activity with intervals, streams and other details by its intervals.icu activity id",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The intervals.icu activity id",
        },
      },
      required: ["id"],
    },
    handler: (params) => {
      const id = expectString(params, "id");
      if (!id) {
        throw new Error('Parameter "id" is required');
      }
      if (!/^\d+$/.test(id)) {
        throw new Error('Parameter "id" must be a numeric activity id');
      }
      return intervalsFetch(`/activity/${id}`);
    },
  },
  {
    name: "get_wellness",
    description:
      "Fetch wellness data (resting HR, HRV, sleep, weight, fatigue, CTL/ATL/TSB) for the configured athlete. Optionally filter by oldest/newest date (YYYY-MM-DD)",
    inputSchema: {
      type: "object",
      properties: {
        oldest: {
          type: "string",
          description: "Only include entries on or after this date (YYYY-MM-DD)",
        },
        newest: {
          type: "string",
          description: "Only include entries on or before this date (YYYY-MM-DD)",
        },
      },
    },
    handler: (params) => {
      const query = buildQuery(params, [
        { param: "oldest", query: "oldest" },
        { param: "newest", query: "newest" },
      ]);
      return intervalsFetch(athletePath("/wellness"), query);
    },
  },
];

function findTool(name: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.name === name);
}

function handleInitialize(id: JsonRpcId): JsonRpcResponse {
  return jsonRpcResult(id, {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "deno-server-mcp",
      version: "1.0.0",
    },
  });
}

function handleToolsList(id: JsonRpcId): JsonRpcResponse {
  return jsonRpcResult(id, {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  });
}

async function handleToolsCall(
  id: JsonRpcId,
  params: Record<string, unknown> | undefined,
): Promise<JsonRpcResponse> {
  const toolName = params?.name;
  if (typeof toolName !== "string") {
    return jsonRpcError(id, INVALID_PARAMS, 'Parameter "name" is required');
  }

  const tool = findTool(toolName);
  if (!tool) {
    return jsonRpcError(id, INVALID_PARAMS, `Unknown tool: ${toolName}`);
  }

  const toolParams = params?.arguments as Record<string, unknown> | undefined;
  if (toolParams !== undefined && typeof toolParams !== "object") {
    return jsonRpcError(id, INVALID_PARAMS, 'Parameter "arguments" must be an object');
  }

  try {
    const payload = await tool.handler(toolParams ?? {});
    return jsonRpcResult(id, textContent(payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonRpcResult(id, {
      content: [
        {
          type: "text",
          text: `Error calling tool ${toolName}: ${message}`,
        },
      ],
      isError: true,
    });
  }
}

async function handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  if (request.id === undefined) {
    return null;
  }

  switch (request.method) {
    case "initialize":
      return handleInitialize(request.id);
    case "tools/list":
      return handleToolsList(request.id);
    case "tools/call":
      return await handleToolsCall(request.id, request.params);
    default:
      return jsonRpcError(
        request.id,
        METHOD_NOT_FOUND,
        `Method not found: ${request.method}`,
      );
  }
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isAuthorizedMcpRequest(req: Request): boolean {
  const authToken = Deno.env.get("MCP_AUTH_TOKEN");
  if (!authToken) {
    return false;
  }

  const authorization = req.headers.get("authorization");
  if (!authorization) {
    return false;
  }

  const [scheme, token] = authorization.split(" ", 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return false;
  }

  return timingSafeEqualString(token, authToken);
}

export function mcpUnauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32001, message: "Unauthorized" },
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": "Bearer",
      },
    },
  );
}

export async function callTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ ok: true; payload: unknown } | { ok: false; message: string }> {
  const tool = findTool(name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    return { ok: true, payload: await tool.handler(args) };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handleMcpRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify(jsonRpcError(null, PARSE_ERROR, "Parse error")),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const requests = Array.isArray(body) ? body : [body];
  const responses: JsonRpcResponse[] = [];

  for (const candidate of requests) {
    if (
      !candidate || typeof candidate !== "object" ||
      (candidate as JsonRpcRequest).jsonrpc !== "2.0" ||
      typeof (candidate as JsonRpcRequest).method !== "string"
    ) {
      const id = (candidate as JsonRpcRequest | undefined)?.id ?? null;
      if (id !== undefined) {
        responses.push(
          jsonRpcError(id, INVALID_REQUEST, "Invalid Request"),
        );
      }
      continue;
    }

    const response = await handleRequest(candidate as JsonRpcRequest);
    if (response) {
      responses.push(response);
    }
  }

  if (responses.length === 0) {
    return new Response(null, { status: 202 });
  }

  const payload = Array.isArray(body) ? responses : responses[0];
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
