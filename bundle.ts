import * as esbuild from "https://deno.land/x/esbuild@v0.17.18/mod.js";

import scripts from './scripts.json' assert { type: "json" } ;

scripts.forEach(async (scriptObj) => {
  const result = await esbuild.build({
    entryPoints: [scriptObj.localPath],
    outfile: `./dist/scripts/${scriptObj.name}.js`,
    bundle: true,
  });
  console.log(result.outputFiles);

  esbuild.stop();
});
