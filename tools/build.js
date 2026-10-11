import { bundle, bundleESM } from "tinybuild/tinybuild/esbuild/bundler.js";
import { mkdir, copyFile } from "node:fs/promises";
import library, { shaderLoader, workers } from "../tinybuild.config.js";
import website from "../tinybuild.web.config.js";

await mkdir("dist", { recursive: true });
await bundle({ ...library.bundler, plugins: [workers()] });
for (const feature of ["core", "camera", "terrain", "space", "progressive"]) {
  await bundle({
    ...library.bundler,
    entryPoints: [`src/entries/${feature}.js`],
    outfile: `dist/${feature}`,
    bundleBrowser: false,
    plugins: [workers()],
  });
}
// Optional external worker for hosts whose CSP disallows blob workers.
await bundleESM(
  {
    entryPoints: ["src/space/space.worker.js"],
    outfile: "dist/space.worker.js",
    bundle: true,
    defaultConfig: true,
    loader: shaderLoader,
    target: "es2022",
    minify: true,
  },
  false,
);

if (process.argv.includes("--checks")) {
  await bundleESM(
    {
      entryPoints: [
        "tests/webgpu.js",
        "tests/terrain-webgpu.js",
        "tests/space-webgpu.js",
        "tests/space-stress-webgpu.js",
        "tests/progressive-webgpu.js",
        "tests/package-webgpu.js",
        "tests/turn-webgpu.js",
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
  for (const file of [
    "demo.js",
    "index.js",
    "space.worker.js",
    ...["index", "core", "camera", "terrain", "space", "progressive"].flatMap(
      (name) => [`${name}.esm.js`, `${name}.cjs`],
    ),
  ]) {
    await copyFile(`dist/${file}`, `site/dist/${file}`);
  }
  console.log(
    "Ready: site/index.html + site/dist (Netlify publish directory: site)",
  );
}
