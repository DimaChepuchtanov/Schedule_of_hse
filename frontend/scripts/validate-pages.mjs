import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildPageRoutes } from "../src/app/pageRoutes.js";

const directory = fileURLToPath(new URL("../src/pages/", import.meta.url));
const modules = Object.fromEntries(
  readdirSync(directory, { recursive: true })
    .filter((file) => file.endsWith(".jsx"))
    .map((file) => [`../pages/${file.replaceAll("\\", "/")}`, () => {}]),
);
const routes = buildPageRoutes(modules);
if (!routes.some(({ path }) => path === "*")) {
  throw new Error("Add src/pages/404.jsx as the fallback page.");
}
console.log(`Pages validated: ${routes.length}`);
