import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
	const ctx = await esbuild.context({
		entryPoints: [path.join(__dirname, "src", "extension.ts")],
		bundle: true,
		format: "cjs",
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: "node",
		outfile: path.join(__dirname, "dist", "extension.cjs"),
		external: ["vscode"],
		logLevel: "silent",
		plugins: [
			{
				name: "watch-plugin",
				setup(build) {
					build.onEnd((result) => {
						if (result.errors.length > 0) {
							console.error(`[watch] build failed with ${result.errors.length} errors`);
						} else {
							console.log(`[watch] build finished at ${new Date().toLocaleTimeString()}`);
						}
					});
				},
			},
		],
	});

	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
		console.log("✓ Andy Agent VS Code extension built successfully into dist/extension.cjs");
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
