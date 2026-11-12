import {
  normalizeStudioNoiseMix, studioNoiseAlgorithms, studioNoiseUniforms,
  studioRegionAlgorithms, studioRegionLabels,
} from "../noise/studio-mix.js";
import { studioLayers } from "../noise/studio-map.js";
import { rangeWeights } from "./detail.js";

export function mountTerrainNoiseEditor(panel, planet, applyMix) {
  const form = document.createElement("form");
  let recipe;
  let selected = 0;
  let dirty = false;
  let stagedMix;
  function row(parent, label, input) {
    const wrap = document.createElement("label");
    wrap.className = "row";
    const name = document.createElement("span");
    name.textContent = label;
    wrap.append(name, input);
    parent.append(wrap);
  }
  function select(parent, label, choices, value, update, editsRecipe = true) {
    const control = document.createElement("select");
    for (const [key, name] of Object.entries(choices)) control.add(new Option(name, key));
    control.value = value;
    control.onchange = () => {
      if (editsRecipe) dirty = true;
      update(control.value);
    };
    row(parent, label, control);
  }
  function number(parent, label, [min, max, step], value, placeholder, update) {
    const input = document.createElement("input");
    input.type = "number";
    input.min = min;
    input.max = max;
    input.step = "any";
    input.placeholder = placeholder === undefined ? "" : String(Number(placeholder.toFixed(5)));
    if (value !== undefined) input.value = value;
    input.title = `Range ${min} to ${max}${step === 1 ? " (whole numbers)" : ""}`;
    input.oninput = () => {
      dirty = true;
      update(input.value === "" ? undefined : input.valueAsNumber);
    };
    row(parent, label, input);
  }
  function render() {
    const { detail } = planet;
    const defaults = studioLayers(planet.studioSeed, planet.geology, true, detail.variation,
      rangeWeights[detail.range], 1).layers;
    recipe ??= {
      regionMap: { algorithm: "perlin", frequency: 3.45, transition: .44 },
      layers: defaults.map(({ entryPoint }) => ({ algorithm: entryPoint, uniforms: {}, weights: [1, 1, 1, 1] })),
    };
    const { regionMap, layers } = recipe;
    const layer = layers[selected];
    const uniformFields = document.createElement("details");
    const uniformTitle = document.createElement("summary");
    uniformTitle.textContent = "Layer uniforms";
    uniformFields.append(uniformTitle);
    const note = document.createElement("p");
    note.className = "hint";
    note.textContent = "Blank uniforms use the current preset. Region weights run from 0 (off) to 1 (full).";
    form.replaceChildren();
    select(form, "Region map", studioRegionAlgorithms, regionMap.algorithm, value => { regionMap.algorithm = value; });
    number(form, "Region frequency", [.25, 24, .05], regionMap.frequency, undefined,
      value => { regionMap.frequency = value; });
    number(form, "Region blend width", [.05, 2, .05], regionMap.transition, undefined,
      value => { regionMap.transition = value; });
    select(form, "Terrain layer", Object.fromEntries(layers.map((item, i) => [i, `${i + 1}. ${studioNoiseAlgorithms[item.algorithm]}`])),
      String(selected), value => { selected = Number(value); render(); }, false);
    select(form, "Layer noise", studioNoiseAlgorithms, layer.algorithm, value => {
      layer.algorithm = value;
      render();
    });
    for (const [i, label] of studioRegionLabels.entries()) {
      number(form, label, [0, 1, .05], layer.weights[i], undefined, value => { layer.weights[i] = value; });
    }
    for (const [name, range] of Object.entries(studioNoiseUniforms)) {
      number(uniformFields, name, range, layer.uniforms[name], defaults[selected].layer[name], value => {
        if (value === undefined) delete layer.uniforms[name];
        else layer.uniforms[name] = value;
      });
    }
    const buttons = document.createElement("div");
    buttons.className = "actions";
    const apply = document.createElement("button");
    apply.type = "submit";
    apply.textContent = "Apply terrain mix";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Use preset mix";
    const status = document.createElement("p");
    status.className = "hint";
    status.setAttribute("role", "status");
    const submit = async (usePreset) => {
      const inputs = [...form.querySelectorAll("button, input, select")];
      inputs.forEach(control => { control.disabled = true; });
      try {
        await applyMix(usePreset ? null : normalizeStudioNoiseMix(recipe));
        refresh();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        inputs.forEach(control => { control.disabled = false; });
      }
    };
    form.onsubmit = event => { event.preventDefault(); void submit(false); };
    reset.onclick = () => submit(true);
    buttons.append(apply, reset);
    form.append(note, uniformFields, buttons, status);
  }
  function refresh() {
    recipe = structuredClone(planet.detail.noiseMix);
    dirty = false;
    stagedMix = undefined;
    render();
  }
  panel.append(form);
  refresh();
  return {
    refresh,
    syncPreset: render,
    get disabled() { return form.inert; },
    set disabled(value) { form.inert = value; },
    read: () => dirty ? normalizeStudioNoiseMix(recipe) :
      stagedMix === undefined ? planet.detail.noiseMix : stagedMix,
    stage(mix) {
      recipe = structuredClone(mix);
      stagedMix = mix;
      dirty = false;
      render();
    },
  };
}
