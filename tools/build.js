import { bundle, bundleESM } from "tinybuild/tinybuild/esbuild/bundler.js";
import { mkdir, copyFile } from "node:fs/promises";
import library, { shaderLoader, workers } from "../tinybuild.config.js";
import website from "../tinybuild.web.config.js";

await mkdir("dist", { recursive: true });
await bundle({ ...library.bundler, plugins: [workers()] });

if (process.argv.includes("--checks")) {
  await bundleESM(
    {
      entryPoints: [
        "tests/webgpu.js",
        "tests/terrain-webgpu.js",
        "tests/space-webgpu.js",
        "tests/space-stress-webgpu.js",
      ],
      outdir: "dist/tests",
      bundle: true,
      defaultConfig: true,
      loader: shaderLoader,
      plugins: [workers()],
      target: "es2022",
      minify: false,
    },
    false,
  );
} else if (!process.argv.includes("--library")) {
  await bundleESM(
    {
      ...website.bundler,
      plugins: [workers()],
      defaultConfig: true,
      bundle: true,
    },
    false,
  );
  // Netlify publishes exactly index.html + dist, without source or node_modules.
  await mkdir("site/dist", { recursive: true });
  await copyFile("index.html", "site/index.html");
  for (const file of ["demo.js", "index.js", "index.esm.js", "index.cjs"]) {
    await copyFile(`dist/${file}`, `site/dist/${file}`);
  }
  console.log(
    "Ready: site/index.html + site/dist (Netlify publish directory: site)",
  );
}
