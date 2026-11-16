import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const clientDir = path.join(root, "dist/client");
const serverDir = path.join(root, "dist/server");
const ignoredNames = new Set([".assetsignore", "_headers", "wrangler.json", ".dev.vars"]);
const textExtensions = new Set(["css", "js", "mjs", "json", "svg", "txt", "map", "html"]);

const contentTypes = {
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  txt: "text/plain; charset=utf-8",
  map: "application/json; charset=utf-8",
  html: "text/html; charset=utf-8",
  woff2: "font/woff2",
  woff: "font/woff",
  ico: "image/x-icon",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".vite") continue;
      files.push(...walk(full));
      continue;
    }
    if (ignoredNames.has(entry.name)) continue;
    files.push(full);
  }
  return files;
}

function cacheControlFor(pathname) {
  const headersPath = path.join(clientDir, "_headers");
  const rules = fs.existsSync(headersPath) ? fs.readFileSync(headersPath, "utf8") : "";
  const wantsImmutable =
    rules.includes("/_next/static/*") && rules.includes("public, max-age=31536000, immutable");
  if (wantsImmutable && pathname.startsWith("/_next/static/")) {
    return "public, max-age=31536000, immutable";
  }
  return undefined;
}

const files = {};
for (const file of walk(clientDir)) {
  const relative = path.relative(clientDir, file).split(path.sep).join("/");
  const pathname = `/${relative}`;
  const extension = path.extname(file).slice(1).toLowerCase();
  const bytes = fs.readFileSync(file);
  const etag = `"${createHash("sha256").update(bytes).digest("hex")}"`;
  const text = textExtensions.has(extension);
  files[pathname] = {
    contentType: contentTypes[extension] ?? "application/octet-stream",
    encoding: text ? "utf8" : "base64",
    body: text ? bytes.toString("utf8") : bytes.toString("base64"),
    etag,
    bytes: bytes.length,
    ...(cacheControlFor(pathname) ? { cacheControl: cacheControlFor(pathname) } : {}),
  };
}

fs.writeFileSync(
  path.join(serverDir, "static-registry.js"),
  `export const files = ${JSON.stringify(files)};\n`,
);

const serveSource = fs.readFileSync(path.join(root, "src/lib/static/serve.ts"), "utf8");
const transpiled = ts.transpileModule(serveSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
fs.writeFileSync(path.join(serverDir, "serve-static.js"), transpiled.outputText);

fs.writeFileSync(
  path.join(serverDir, "asset-worker.js"),
  `import app from "./index.js";
import { files } from "./static-registry.js";
import { serveStatic } from "./serve-static.js";

export default {
  async fetch(request, env, ctx) {
    const embedded = serveStatic(request, files);
    if (embedded) return embedded;
    return app.fetch(request, env, ctx);
  },
};
`,
);

const wranglerPath = path.join(serverDir, "wrangler.json");
const wrangler = JSON.parse(fs.readFileSync(wranglerPath, "utf8"));
delete wrangler.assets;
wrangler.main = "asset-worker.js";
fs.writeFileSync(wranglerPath, JSON.stringify(wrangler));

const count = Object.keys(files).length;
const bytes = Object.values(files).reduce((sum, file) => sum + file.bytes, 0);
console.log(`Embedded ${count} static files (${bytes} bytes) into the Worker.`);
