import { assertEquals } from "https://deno.land/std@0.213.0/testing/asserts.ts";
import {
  appendVaryHeader,
  getAllowedCorsOrigin,
  htmlResponse,
  jsonResponse,
} from "./http.ts";

Deno.test("htmlResponse - sets content type", async () => {
  const res = htmlResponse("<html></html>");
  assertEquals(res.headers.get("Content-Type"), "text/html; charset=UTF-8");
  assertEquals(await res.text(), "<html></html>");
});

Deno.test("jsonResponse - sets content type and serializes", async () => {
  const res = jsonResponse({ hello: "world" });
  assertEquals(res.headers.get("Content-Type"), "application/json; charset=UTF-8");
  assertEquals(await res.json(), { hello: "world" });
});

Deno.test("appendVaryHeader - adds new field", () => {
  const headers = new Headers();
  appendVaryHeader(headers, "Origin");
  assertEquals(headers.get("Vary"), "Origin");
});

Deno.test("appendVaryHeader - appends to existing", () => {
  const headers = new Headers({ Vary: "Accept-Encoding" });
  appendVaryHeader(headers, "Origin");
  assertEquals(headers.get("Vary"), "Accept-Encoding, Origin");
});

Deno.test("appendVaryHeader - does not duplicate", () => {
  const headers = new Headers({ Vary: "Origin" });
  appendVaryHeader(headers, "Origin");
  assertEquals(headers.get("Vary"), "Origin");
});

Deno.test("getAllowedCorsOrigin - null origin", () => {
  assertEquals(getAllowedCorsOrigin(null), null);
});

Deno.test("getAllowedCorsOrigin - invalid URL", () => {
  assertEquals(getAllowedCorsOrigin("not a url"), null);
});

Deno.test("getAllowedCorsOrigin - localhost", () => {
  assertEquals(getAllowedCorsOrigin("http://localhost:8000"), "http://localhost:8000");
  assertEquals(getAllowedCorsOrigin("http://127.0.0.1:3000"), "http://127.0.0.1:3000");
});

Deno.test("getAllowedCorsOrigin - allowed hostname", () => {
  assertEquals(
    getAllowedCorsOrigin("https://goransle.omg.lol"),
    "https://goransle.omg.lol",
  );
  assertEquals(
    getAllowedCorsOrigin("https://ferjetider.goransle.no"),
    "https://ferjetider.goransle.no",
  );
  assertEquals(
    getAllowedCorsOrigin("https://www.goransle.no"),
    "https://www.goransle.no",
  );
  assertEquals(
    getAllowedCorsOrigin("https://deno.dev"),
    "https://deno.dev",
  );
});

Deno.test("getAllowedCorsOrigin - deno.dev subdomain", () => {
  assertEquals(
    getAllowedCorsOrigin("https://my-app.deno.dev"),
    "https://my-app.deno.dev",
  );
});

Deno.test("getAllowedCorsOrigin - disallowed http non-localhost", () => {
  assertEquals(getAllowedCorsOrigin("http://example.com"), null);
});

Deno.test("getAllowedCorsOrigin - disallowed hostname", () => {
  assertEquals(getAllowedCorsOrigin("https://evil.com"), null);
});

Deno.test("getAllowedCorsOrigin - non-http protocol", () => {
  assertEquals(getAllowedCorsOrigin("ftp://example.com"), null);
});
