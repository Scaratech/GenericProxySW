import { build } from "esbuild";

await build({
    entryPoints: {
        worker: "src/GenericProxySW.ts",
    },

    outdir: "dist",
    bundle: true,
    treeShaking: true,
    minify: true,
    format: "esm",
    sourcemap: true
});