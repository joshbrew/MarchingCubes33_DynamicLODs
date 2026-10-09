import * as THREE from "three";
import {
  TerrainRenderer,
  TerrainLOD,
  TerrainField,
} from "../dist/index.esm.js";
const AdaptiveTerrain = { Renderer: TerrainRenderer };
(async function () {
  const results = document.getElementById("results"),
    lines = [];
  let terrain;
  const log = (text) => {
    lines.push(text);
    results.textContent = lines.join("\n");
  };
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  try {
    terrain = await new AdaptiveTerrain.Renderer(
      document.getElementById("terrain"),
      {
        worldSize: 2048,
        tileSize: 128,
        maxDivs: 32,
        memoryMB: 4,
        buildsPerFrame: 8,
      },
    ).initialize();
    terrain.device.pushErrorScope("validation");
    const camera = new THREE.PerspectiveCamera(60, 1.6, 1, 1000),
      vp = new THREE.Matrix4(),
      frustum = new THREE.Frustum();
    let now = 0;
    function render(
      position = [-100, 170, 300],
      target = [0, 30, -100],
      options = {},
      far = 1000,
    ) {
      camera.far = far;
      camera.position.fromArray(position);
      camera.lookAt(new THREE.Vector3(...target));
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(vp);
      return terrain.render(
        {
          position,
          player: position,
          height: 400,
          fov: Math.PI / 3,
          far,
          viewProjection: vp.elements,
        },
        frustum.planes.map((p) => [
          p.normal.x,
          p.normal.y,
          p.normal.z,
          p.constant,
        ]),
        (now += 110),
        options,
      );
    }
    async function settle(position, target, options, far) {
      let stats;
      for (let i = 0; i < 100; i++) {
        stats = render(position, target, options, far);
        await terrain.device.queue.onSubmittedWorkDone();
        for (const [id, level] of terrain.lastActual)
          for (const [neighbor] of TerrainLOD.neighbors(id, terrain.side)) {
            if (terrain.lastActual.has(neighbor))
              assert(
                Math.abs(level - terrain.lastActual.get(neighbor)) <= 1,
                "streaming LOD adjacency",
              );
          }
        if (stats.pending === 0 && i > 0) break;
      }
      assert(stats.pending === 0, "streamed tiles should settle");
      assert(stats.drawn > 0, "visible terrain must be drawn");
      return stats;
    }
    await settle();
    log("PASS terrain compute and render pipelines");
    const id = terrain.visibleIds.find((id) => terrain.entries.get(id)?.ready),
      patch = await terrain.readPatch(id),
      tile = terrain.tiles[id];
    let maxHeightError = 0,
      maxNormalError = 0;
    for (let z = 0; z <= patch.divs; z++)
      for (let x = 0; x <= patch.divs; x++) {
        const offset = (z * (patch.divs + 1) + x) * 8,
          worldX = tile.ox + (x * tile.size) / patch.divs,
          worldZ = tile.oz + (z * tile.size) / patch.divs;
        const expected = TerrainField.heightGradient(worldX, worldZ),
          normal = [-expected[1], 1, -expected[2]],
          length = Math.hypot(...normal);
        assert(
          Math.abs(patch.data[offset] - worldX) < 1e-5 &&
            Math.abs(patch.data[offset + 2] - worldZ) < 1e-5,
          "world sample coordinates",
        );
        maxHeightError = Math.max(
          maxHeightError,
          Math.abs(patch.data[offset + 1] - expected[0]),
        );
        normal.forEach((value, axis) => {
          maxNormalError = Math.max(
            maxNormalError,
            Math.abs(patch.data[offset + 4 + axis] - value / length),
          );
        });
      }
    assert(
      maxHeightError < 0.02 && maxNormalError < 0.002,
      "GPU heights/normals agree with analytic CPU field",
    );
    log(
      `PASS GPU world samples and normals: max height error ${maxHeightError.toFixed(5)} m`,
    );
    const generated = terrain.stats.generated;
    const plans = terrain.stats.planBuilds;
    for (let i = 0; i < 5; i++) render();
    assert(
      terrain.stats.generated === generated,
      "stationary warm cache must not regenerate",
    );
    log("PASS stationary frames reuse cached samples");
    assert(
      terrain.stats.planBuilds === plans,
      "stationary frames retain stitching groups and instance uploads",
    );
    assert(
      terrain.stats.vegetation.trees > 0 && terrain.stats.vegetation.draws <= 3,
      "trees use bounded instanced batches",
    );
    terrain.vegetation.enabled = false;
    render();
    assert(terrain.stats.vegetation.trees === 0, "tree toggle disables draws");
    terrain.vegetation.enabled = true;
    render();
    assert(
      terrain.stats.vegetation.trees > 0,
      "tree toggle restores vegetation",
    );
    log(
      "PASS three instanced tree LODs, tree toggle and cached stationary draw plans",
    );
    terrain.vegetation.enabled = false;
    async function profile(rebuild) {
      const samples = [];
      for (let i = 0; i < 80; i++) {
        if (rebuild) terrain.drawPlan = null;
        const s = render();
        samples.push(s.cpuMs);
        await terrain.device.queue.onSubmittedWorkDone();
      }
      samples.sort((a, b) => a - b);
      return samples[Math.floor(samples.length / 2)];
    }
    const rebuilt = await profile(true),
      cached = await profile(false);
    terrain.vegetation.enabled = true;
    log(
      `PROFILE stationary terrain CPU submit: rebuilding draw groups ${rebuilt.toFixed(3)} ms / cached ${cached.toFixed(3)} ms (trees off, same view)`,
    );
    terrain.generation++;
    await settle();
    assert(
      terrain.stats.generated > generated,
      "field generation invalidates a settled draw plan",
    );
    log("PASS generation changes invalidate stationary caches");
    const adaptive = {
      triangles: terrain.stats.triangles,
      samples: terrain.stats.activeSamples,
    };
    terrain.configure({ uniform: true });
    const uniform = await settle();
    assert(
      adaptive.triangles < uniform.triangles &&
        adaptive.samples < uniform.activeSamples,
      "adaptive grids should reduce geometry",
    );
    log(
      `PASS adaptive ${adaptive.triangles} vs uniform ${uniform.triangles} triangles`,
    );
    terrain.configure({ uniform: false });
    for (const [position, target] of [
      [
        [700, 210, 600],
        [350, 0, 0],
      ],
      [
        [-800, 180, -700],
        [-300, 0, -200],
      ],
      [
        [0, 700, 0],
        [0, 0, -100],
      ],
      [
        [800, 150, -800],
        [200, 0, -200],
      ],
    ]) {
      terrain.needsSelection = true;
      await settle(position, target);
      for (const [id, level] of terrain.lastActual)
        for (const [neighbor] of TerrainLOD.neighbors(id, terrain.side)) {
          if (terrain.lastActual.has(neighbor))
            assert(
              Math.abs(level - terrain.lastActual.get(neighbor)) <= 1,
              "resident LOD adjacency after teleport",
            );
        }
      assert(
        terrain.entries.size <= terrain.capacity,
        "bounded resident cache",
      );
    }
    assert(
      terrain.stats.evicted > 0,
      "camera travel must exercise LRU eviction",
    );
    log(
      "PASS camera teleports, LRU eviction, resident-cache bounds and 2:1 transitions",
    );
    terrain.algorithm = "bourke";
    await settle(undefined, undefined, { wireframe: true, lodColors: true });
    log("PASS Bourke switch, wireframe and LOD colors");
    terrain.needsSelection = true;
    const nearCount = (await settle(undefined, undefined, {}, 400)).visible;
    for (const id of terrain.visibleIds)
      assert(
        TerrainLOD.distanceTo(terrain.tiles[id], camera.position.toArray()) <=
          400,
        "render distance culls distant tiles",
      );
    terrain.needsSelection = true;
    const farCount = (await settle()).visible;
    assert(nearCount < farCount, "shorter render range selects fewer tiles");
    log("PASS max render distance limits terrain selection");
    terrain.needsSelection = true;
    const stress = await settle(undefined, undefined, {}, 32000);
    assert(
      stress.drawn <= terrain.capacity &&
        terrain.entries.size <= terrain.capacity,
      "32 km stress range respects the resident budget",
    );
    log("PASS 32 km render cutoff with bounded residency");

    terrain.configure({ infinite: true });
    await settle();
    const originalTree = terrain.tree;
    const centerId = terrain.visibleIds
      .filter((id) => terrain.entries.get(id)?.ready)
      .sort(
        (a, b) =>
          TerrainLOD.distanceTo(terrain.tiles[a], [-100, 170, 300]) -
          TerrainLOD.distanceTo(terrain.tiles[b], [-100, 170, 300]),
      )[0];
    const centerTile = terrain.tiles[centerId],
      worldKey = `${centerTile.ox},${centerTile.oz}`,
      savedSlot = terrain.entries.get(centerId).slot,
      savedPatch = await terrain.readPatch(centerId);
    terrain.updateWindow({
      position: [terrain.origin[0] + 256, 170, terrain.origin[1]],
    });
    const reusedId = terrain.tiles.find(
      (t) => `${t.ox},${t.oz}` === worldKey,
    )?.id;
    assert(
      terrain.entries.get(reusedId)?.slot === savedSlot,
      "overlapping world tiles retain their GPU atlas slot",
    );
    const reusedPatch = await terrain.readPatch(reusedId);
    assert(
      reusedPatch.divs === savedPatch.divs &&
        reusedPatch.data.every((v, i) => v === savedPatch.data[i]),
      "recenter must not alter cached world samples",
    );
    log("PASS infinite recenter preserves overlapping GPU samples exactly");
    for (const z of [-4096, -12288, -32768, 300]) {
      const position = [-100, TerrainField.height(-100, z) + 170, z];
      await settle(position, [
        -100,
        TerrainField.height(-100, z - 600),
        z - 600,
      ]);
      assert(
        terrain.tree === originalTree,
        "streaming reuses the static local hierarchy",
      );
      assert(
        terrain.entries.size <= terrain.capacity &&
          terrain.entries.size + terrain.free.length === terrain.capacity,
        "streaming has bounded atlas ownership",
      );
      assert(
        new Set([...terrain.entries.values()].map((e) => e.slot)).size ===
          terrain.entries.size,
        "resident tiles have distinct atlas slots",
      );
      const probeId = terrain.visibleIds.find(
          (id) => terrain.entries.get(id)?.ready,
        ),
        probe = await terrain.readPatch(probeId),
        probeTile = terrain.tiles[probeId];
      for (let i = 0; i < probe.data.length; i += 8) {
        assert(
          Math.abs(
            probe.data[i + 1] -
              TerrainField.height(probe.data[i], probe.data[i + 2]),
          ) < 0.02,
          "streamed world noise agrees with CPU",
        );
        assert(
          probe.data[i] >= probeTile.ox &&
            probe.data[i] <= probeTile.ox + probeTile.size,
          "streamed samples remain in their world tile",
        );
      }
    }
    assert(
      terrain.stats.windowShifts >= 4,
      "travel should recenter repeatedly",
    );
    assert(
      terrain.vegetation.cache.size <= 512,
      "tree cache remains bounded during infinite travel",
    );
    terrain.configure({ infinite: false });
    await settle();
    assert(
      terrain.origin.every((v) => v === 0),
      "bounded mode restores the original map",
    );
    log(
      "PASS infinite travel to 32 km, return visits, bounded cache and 2:1 stitching",
    );
    const validation = await terrain.device.popErrorScope();
    assert(!validation, validation?.message);
    assert(!terrain.errors.length, terrain.errors.join("\n"));
    log("ALL TERRAIN WEBGPU CHECKS PASSED");
    document.body.dataset.result = "pass";
  } catch (error) {
    log(`FAIL ${error.stack || error.message}`);
    document.body.dataset.result = "fail";
  } finally {
    terrain?.dispose();
  }
})();
