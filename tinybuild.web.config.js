import { shaderLoader, workers } from "./tinybuild.config.js";

export default {
  build: true,
  server: false,
  bundler: {
    entryPoints: ["index.js"],
    outfile: "dist/demo.js",
    bundleESM: true,
    bundleBrowser: false,
    bundleTypes: false,
    bundleHTML: false,
    includeDefaultPlugins: false,
    plugins: [workers()],
    loader: { ...shaderLoader, ".html": "text" },
    target: "es2022",
    minify: true,
    sourcemap: false,
    metafile: true,
  },
};
