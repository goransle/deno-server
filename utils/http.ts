export function htmlResponse(html: string) {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
    },
  });
}

export function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
}

export function appendVaryHeader(headers: Headers, fieldName: string) {
  const existingVary = headers.get("Vary");
  if (!existingVary) {
    headers.set("Vary", fieldName);
    return;
  }

  const existingFields = existingVary
    .split(",")
    .map((field) => field.trim().toLowerCase());
  if (existingFields.includes(fieldName.toLowerCase())) {
    return;
  }

  headers.set("Vary", `${existingVary}, ${fieldName}`);
}

export function getAllowedCorsOrigin(originHeader: string | null) {
  if (!originHeader) {
    return null;
  }

  let originUrl: URL;
  try {
    originUrl = new URL(originHeader);
  } catch {
    return null;
  }

  const { hostname, protocol } = originUrl;
  const isHttpOrigin = protocol === "http:" || protocol === "https:";
  if (!isHttpOrigin) {
    return null;
  }

  const isLocalhostOrigin = hostname === "localhost" ||
    hostname === "127.0.0.1";
  if (isLocalhostOrigin) {
    return originUrl.origin;
  }

  if (protocol !== "https:") {
    return null;
  }

  const allowedHostnames = new Set([
    "goransle.omg.lol",
    "ferjetider.goransle.no",
    "www.goransle.no",
    "deno.dev",
  ]);

  if (allowedHostnames.has(hostname) || hostname.endsWith(".deno.dev")) {
    return originUrl.origin;
  }

  return null;
}
