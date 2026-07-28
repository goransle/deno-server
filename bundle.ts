import * as esbuild from "https://deno.land/x/esbuild@v0.20.2/mod.js";

import scripts from "./scripts.json" with { type: "json" };

for (const scriptObj of scripts) {
  if (!scriptObj.localPath) {
    continue;
  }

  await esbuild.build({
    entryPoints: [scriptObj.localPath],
    outfile: `./dist/scripts/${scriptObj.name}.js`,
    bundle: true,
  });
}

esbuild.stop();
