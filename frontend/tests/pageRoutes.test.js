import assert from "node:assert/strict";
import test from "node:test";
import { buildPageRoutes, pagePathFromFile } from "../src/app/pageRoutes.js";

test("A new page file gets a URL without a route registration", () => {
  assert.equal(pagePathFromFile("../pages/profile.jsx"), "/profile");
  assert.equal(pagePathFromFile("../pages/index.jsx"), "/");
  assert.equal(pagePathFromFile("../pages/groups/index.jsx"), "/groups");
  assert.equal(pagePathFromFile("../pages/groups/new.jsx"), "/groups/new");
});

test("Nested parameters are exposed as React Router parameters", () => {
  assert.equal(pagePathFromFile("../pages/schedule/[id].jsx"), "/schedule/:id");
  assert.equal(pagePathFromFile("../pages/groups/[groupId]/lessons/[lessonId].jsx"), "/groups/:groupId/lessons/:lessonId");
});

test("Private helpers, collocated tests and unrelated files are not pages", () => {
  for (const file of ["../pages/_parts/Button.jsx", "../pages/profile/_Card.jsx", "../pages/profile.test.jsx", "../pages/profile.spec.jsx", "../pages/readme.md", "../features/auth/AuthPage.jsx"]) {
    assert.equal(pagePathFromFile(file), null, file);
  }
});

test("Page paths normalize Windows separators", () => {
  assert.equal(pagePathFromFile("..\\pages\\profile\\index.jsx"), "/profile");
});

test("Pages cannot capture the API, admin or static namespaces", () => {
  for (const prefix of ["api", "admin", "static", "media", "API"]) {
    assert.throws(() => pagePathFromFile(`../pages/${prefix}/index.jsx`), /reserved Django prefix/);
  }
  assert.equal(pagePathFromFile("../pages/api-help.jsx"), "/api-help");
});

test("Invalid or repeated parameters fail clearly", () => {
  assert.throws(() => pagePathFromFile("../pages/[...path].jsx"), /Unsupported/);
  assert.throws(() => pagePathFromFile("../pages/[id]/[id].jsx"), /Repeated/);
});

test("Ambiguous file names are rejected rather than opening the wrong page", () => {
  for (const names of [["profile.jsx", "profile/index.jsx"], ["Profile.jsx", "profile.jsx"], ["users/[id].jsx", "users/[slug].jsx"]]) {
    assert.throws(() => buildPageRoutes(Object.fromEntries(names.map((name) => [`../pages/${name}`, () => {}]))), /Conflicting page routes/);
  }
});

test("Lazy loaders are retained and the not-found route is last", () => {
  const profile = () => Promise.resolve({ default: "profile" });
  const fallback = () => Promise.resolve({ default: "404" });
  const routes = buildPageRoutes({ "../pages/404.jsx": fallback, "../pages/profile.jsx": profile });
  assert.deepEqual(routes.map(({ path }) => path), ["/profile", "*"]);
  assert.equal(routes[0].load, profile);
  assert.equal(routes[1].load, fallback);
});
