import { build } from "esbuild";

await Promise.all([
  build({
    entryPoints: ["electron/main.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "dist-electron/main.js",
    external: ["electron"],
    target: "node20"
  }),
  build({
    entryPoints: ["electron/preload.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "dist-electron/preload.js",
    external: ["electron"],
    target: "node20"
  })
]);
