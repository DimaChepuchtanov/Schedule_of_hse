const requiredPages = [
  { path: "/", file: "src/pages/index.jsx" },
  { path: "/auth", file: "src/pages/auth.jsx" },
  { path: "/admin", file: "src/pages/admin.jsx" },
  { path: "*", file: "src/pages/404.jsx" },
];

export function assertRequiredPages(routes) {
  const paths = new Set(routes.map(({ path }) => path));
  const missing = requiredPages.filter(({ path }) => !paths.has(path));
  if (missing.length) {
    throw new Error(
      "Не найдены обязательные страницы: " +
        missing.map(({ file, path }) => `${file} (${path})`).join(", ") +
        ". Восстановите эти файлы из полного frontend перед сборкой.",
    );
  }
  return routes;
}
