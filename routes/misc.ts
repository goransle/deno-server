import { render } from "https://esm.sh/preact-render-to-string@6.5.12";
import { addRoute } from "../router.ts";
import {
  callTool,
  handleMcpRequest,
  isAuthorizedMcpRequest,
  mcpUnauthorizedResponse,
} from "../mcp.ts";
import { LatestActivity } from "../pages/latest-activity.tsx";
import { htmlResponse } from "../utils/http.ts";

type IntervalActivity = {
  id?: string;
  name?: string;
  type?: string;
  startTime?: string;
  distance?: number;
  movingTime?: number;
  elapsedTime?: number;
  totalElevationGain?: number;
};

export function registerMiscRoutes() {
  addRoute("POST", "/mcp", (req) => {
    if (!isAuthorizedMcpRequest(req)) {
      return mcpUnauthorizedResponse();
    }

    return handleMcpRequest(req);
  });

  addRoute("GET", "/latest-activity", async () => {
    const result = await callTool("get_activities", {});

    let activity: IntervalActivity | undefined;
    let error: string | undefined;

    if (!result.ok) {
      error = result.message;
    } else {
      const activities = Array.isArray(result.payload)
        ? result.payload as IntervalActivity[]
        : undefined;
      if (!activities || activities.length === 0) {
        error = "No activities found.";
      } else {
        const latest = activities.find((candidate) => candidate.startTime) ??
          activities[0];
        activity = {
          id: latest.id !== undefined ? String(latest.id) : undefined,
          name: latest.name,
          type: latest.type,
          startTime: latest.startTime,
          distance: latest.distance,
          movingTime: latest.movingTime,
          elapsedTime: latest.elapsedTime,
          totalElevationGain: latest.totalElevationGain,
        };
      }
    }

    const page = `<!DOCTYPE html>${
      render(LatestActivity({ activity, error }))
    }`;
    return htmlResponse(page);
  });

  addRoute("GET", "/demo", async () => {
    const file = await Deno.readTextFile("./demo_geolocation.html");

    return htmlResponse(file);
  });
}
