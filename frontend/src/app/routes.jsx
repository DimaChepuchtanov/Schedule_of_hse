import { lazy } from "react";
import { buildPageRoutes } from "./pageRoutes.js";
import { assertRequiredPages } from "./requiredPages.js";

// Vite discovers new pages and builds a separate chunk for each page.
const modules = import.meta.glob("../pages/**/*.jsx");

export const pageRoutes = assertRequiredPages(buildPageRoutes(modules)).map(
  ({ path, load }) => ({
    path,
    Component: lazy(load),
  }),
);
