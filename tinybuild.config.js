// The same WGSL text loader and export modes used by the cloud/AVBD projects.
import { workerPlugin } from "tinybuild/tinybuild/esbuild/workerPlugin.js";

export const shaderLoader = { ".wgsl": "text" };
export const workers = () =>
  workerPlugin({
    blobWorkers: true,
    bundler: {
      loader: shaderLoader,
      format: "iife",
      target: "es2022",
      minify: true,
    },
  });

export default {
  bundler: {
    entryPoints: ["src/index.js"],
    outfile: "dist/index",
    bundleESM: true,
    bundleBrowser: true,
    bundleCommonJS: { platform: "node" },
    bundleNode: false,
    bundleTypes: false,
    bundleHTML: false,
    globalThis: "MarchingCubes",
    includeDefaultPlugins: false,
    plugins: [workers()],
    loader: shaderLoader,
    target: "es2022",
    minify: true,
    sourcemap: false,
    metafile: true,
  },
  server: {
    protocol: "http",
    host: "127.0.0.1",
    port: 8000,
    startpage: "index.html",
    hotreload: 5000,
  },
};
