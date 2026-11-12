import page from "../../demo/planet.html";
import { startDemo } from "../planet/demo.js";

export { sunDirection } from "../planet/lighting.js";

export async function mountPlanetApproach({ setup, ...options } = {}) {
  const parsed = new DOMParser().parseFromString(page, "text/html");
  document.title = parsed.title;
  document.head.append(...parsed.head.querySelectorAll('style,link[rel="stylesheet"]'));
  document.body.replaceChildren(...parsed.body.childNodes);
  setup?.(document);
  try {
    await startDemo(options);
  } catch (error) {
    const status = document.getElementById("status");
    status.textContent = error.message;
    status.classList.add("error");
    throw error;
  }
}
