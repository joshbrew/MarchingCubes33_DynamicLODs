import { execFileSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";

const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this through npm run pack:check.");
const output = JSON.parse(
  execFileSync(process.execPath, [npm, "pack", "--json", "--ignore-scripts"], {
    encoding: "utf8",
  }),
)[0];
const tarball = resolve(output.filename),
  folder = resolve(".temp", `package-consumer-${Date.now()}`);
const files = new Set(output.files.map((f) => f.path));
assert(
  files.has("dist/space.worker.js") &&
    files.has("types/index.d.ts") &&
    files.has("examples/package.html") &&
    files.has("examples/package.js"),
);
assert(
  ![...files].some(
    (f) =>
      f.startsWith("node_modules/") ||
      f.startsWith("dist/tests/") ||
      f === "dist/demo.js",
  ),
);
await mkdir(folder, { recursive: true });
await writeFile(
  join(folder, "package.json"),
  JSON.stringify({ private: true, type: "module" }),
);
execFileSync(
  process.execPath,
  [
    npm,
    "install",
    "--offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--cache",
    join(folder, "cache"),
    tarball,
  ],
  { cwd: folder, stdio: "pipe" },
);
await writeFile(
  join(folder, "check.mjs"),
  `
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const require=createRequire(import.meta.url),name='marching-cubes-bourke-mc33';
for(const feature of ['', '/core','/camera','/terrain','/space','/progressive']) {
 const esm=await import(name+feature),cjs=require(name+feature);
 assert.deepEqual(Object.keys(esm).sort(),Object.keys(cjs).sort());
}
const api=await import(name),surface=await api.createSphere({radius:12,surface:'both',thickness:1});
assert(surface.triangleCount>0&&surface.groups.length===2);
assert.equal(typeof api.createTerrain,'function');assert.equal(typeof api.createSpace,'function');assert.equal(typeof api.createProgressiveTerrain,'function');
const context=vm.createContext({URL,Blob});
vm.runInContext(await readFile(require.resolve(name+'/browser'),'utf8'),context);
assert.equal(typeof context.MarchingCubes.createTerrain,'function');
assert((await readFile(require.resolve(name+'/space.worker'),'utf8')).includes('onmessage'));
console.log('PASS installed tarball: ESM + CommonJS for all 6 entries, browser global, sphere shells, external worker; no runtime dependencies.');
`,
);
execFileSync(process.execPath, [join(folder, "check.mjs")], {
  cwd: folder,
  stdio: "inherit",
});
console.log(
  `Package: ${tarball} (${(output.size / 1024).toFixed(0)} KiB packed)`,
);
