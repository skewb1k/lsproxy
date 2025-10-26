import { build } from "bun";

await build({
	entrypoints: ["src/index.ts"],
	outdir: "build",
	minify: true,
	target: "bun",
});
