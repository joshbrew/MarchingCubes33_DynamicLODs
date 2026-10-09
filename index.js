import spherePage from "./demo/sphere.html";
import terrainPage from "./demo/terrain.html";
import spacePage from "./demo/space.html";

const demos = {
  sphere: { page: spherePage, load: () => import("./src/demo.js") },
  terrain: { page: terrainPage, load: () => import("./src/terrain/demo.js") },
  space: { page: spacePage, load: () => import("./src/space/demo.js") },
};
const selected = new URLSearchParams(location.search).get("demo") || "sphere";
const demo = demos[selected] || demos.sphere;
const page = new DOMParser().parseFromString(demo.page, "text/html");
document.title = page.title;
document.head.append(
  ...page.head.querySelectorAll('style,link[rel="stylesheet"]'),
);
document.body.replaceChildren(...page.body.childNodes);
try {
  await (await demo.load()).startDemo();
} catch (error) {
  const status = document.getElementById("status");
  if (status) {
    status.textContent = error.message;
    status.classList.add("error");
  }
  console.error(error);
}
