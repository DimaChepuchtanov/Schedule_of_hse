const PAGES_DIRECTORY = "../pages/";
const RESERVED_PREFIXES = new Set(["api", "static", "media"]);

/** Map a page file to its URL; return null for private helpers and tests. */
export function pagePathFromFile(file) {
  const normalized = file.replaceAll("\\", "/");
  if (!normalized.startsWith(PAGES_DIRECTORY) || !normalized.endsWith(".jsx")) {
    return null;
  }

  const segments = normalized.slice(PAGES_DIRECTORY.length, -4).split("/");
  if (segments.some((part) => part.startsWith("_") || part.startsWith("."))) {
    return null;
  }
  if (/\.(test|spec)$/.test(segments.at(-1))) return null;
  if (segments.length === 1 && segments[0] === "404") return "*";
  if (segments.at(-1) === "index") segments.pop();

  const parameters = new Set();
  const parts = segments.map((part) => {
    const parameter = /^\[([A-Za-z_][A-Za-z0-9_]*)\]$/.exec(part);
    if (parameter) {
      const name = parameter[1];
      if (parameters.has(name)) throw new Error(`Repeated page parameter: ${file}`);
      parameters.add(name);
      return `:${name}`;
    }
    if (!part || /[\[\]?#:*]/.test(part)) {
      throw new Error(`Unsupported page filename: ${file}`);
    }
    return part;
  });

  if (RESERVED_PREFIXES.has(parts[0]?.toLowerCase())) {
    throw new Error(`Page uses a reserved Django prefix: ${file}`);
  }
  return `/${parts.join("/")}`;
}

/** Build stable routes and reject files that would match the same URL. */
export function buildPageRoutes(modules) {
  const seen = new Map();
  const routes = [];
  for (const [file, load] of Object.entries(modules)) {
    const path = pagePathFromFile(file);
    if (path === null) continue;
    const key = path.toLowerCase().replace(/:[^/]+/g, ":parameter");
    if (seen.has(key)) {
      throw new Error(`Conflicting page routes: ${seen.get(key)} and ${file}`);
    }
    seen.set(key, file);
    routes.push({ path, load });
  }
  return routes.sort((a, b) => {
    if (a.path === "*") return 1;
    if (b.path === "*") return -1;
    return a.path.localeCompare(b.path);
  });
}
