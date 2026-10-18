import {
  fromFileUrl,
  isAbsolute,
  relative,
  resolve,
} from "https://deno.land/std@0.213.0/path/mod.ts";
import { addRoute } from "../router.ts";
import { htmlResponse } from "../utils/http.ts";
import { decodePathnameSafely, ensureStandardsModeStatusHtml } from "../utils/html.ts";

const statusMessagesDirectoryUrl = new URL(
  "./public/status-messages/",
  import.meta.url,
);
const statusMessagesDirectoryPath = fromFileUrl(statusMessagesDirectoryUrl);
const statusMessagesRoutePrefix = "/status-messages/";

export function registerStatusRoutes() {
  addRoute(
    "GET",
    "/status-messages/*",
    async (req) => {
      const pathname = new URL(req.url).pathname;
      if (!pathname.startsWith(statusMessagesRoutePrefix)) {
        return new Response(null, { status: 404 });
      }

      const requestedPath = pathname.slice(statusMessagesRoutePrefix.length);
      if (requestedPath.length === 0) {
        return new Response(null, { status: 404 });
      }

      const decodedRequestedPath = decodePathnameSafely(requestedPath);
      if (!decodedRequestedPath) {
        return new Response(null, { status: 404 });
      }

      const hasWindowsAbsolutePrefix = /^[a-zA-Z]:[\\/]/.test(
        decodedRequestedPath,
      ) || decodedRequestedPath.startsWith("\\\\");
      if (isAbsolute(decodedRequestedPath) || hasWindowsAbsolutePrefix) {
        return new Response(null, { status: 404 });
      }

      const resolvedFilePath = resolve(
        statusMessagesDirectoryPath,
        decodedRequestedPath,
      );
      const relativePath = relative(
        statusMessagesDirectoryPath,
        resolvedFilePath,
      );
      const isWithinStatusMessagesDirectory = relativePath.length > 0 &&
        !relativePath.startsWith("..") &&
        !isAbsolute(relativePath);
      if (!isWithinStatusMessagesDirectory) {
        return new Response(null, { status: 404 });
      }

      try {
        const file = await Deno.readTextFile(resolvedFilePath);
        return htmlResponse(ensureStandardsModeStatusHtml(file));
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          return htmlResponse(ensureStandardsModeStatusHtml(""));
        }

        return new Response(null, { status: 500 });
      }
    },
  );
}
