import * as esbuild from "https://deno.land/x/esbuild@v0.20.2/mod.js";

import scripts from "./scripts.json" with { type: "json" };

scripts.forEach(async (scriptObj) => {
  if (scriptObj.localPath) {
    const result = await esbuild.build({
      entryPoints: [scriptObj.localPath],
      outfile: `./dist/scripts/${scriptObj.name}.js`,
      bundle: true,
    });
    console.log(result.outputFiles);

    esbuild.stop();
  }
});
