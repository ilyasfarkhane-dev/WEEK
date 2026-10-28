import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const browser = path.resolve(__dirname, "src/browser");
const storeCandidates = [path.resolve(__dirname, "data/store.json"), path.resolve(__dirname, "public/store.json")];

function publishedStore() {
  for (const file of storeCandidates) {
    if (!existsSync(file)) continue;
    const source = readFileSync(file);
    if (source.includes("ada.mensah@demo.gic.local")) return source;
  }
  return null;
}

function jsonDatabase(): Plugin {
  return {
    name: "gic-json-database",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/store.json") return next();
        const source = publishedStore();
        if (!source) {
          response.statusCode = 404;
          response.end("{}");
          return;
        }
        response.setHeader("Content-Type", "application/json");
        response.end(source);
      });
    },
    generateBundle() {
      const source = publishedStore();
      if (!source) return;
      this.emitFile({ type: "asset", fileName: "store.json", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), jsonDatabase()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: /^crypto$/, replacement: path.join(browser, "crypto.ts") },
      { find: /^node:crypto$/, replacement: path.join(browser, "crypto.ts") },
      { find: /^node:fs$/, replacement: path.join(browser, "fs.ts") },
      { find: /^node:fs\/promises$/, replacement: path.join(browser, "fs-promises.ts") },
      { find: /^node:path$/, replacement: path.join(browser, "path.ts") },
      { find: /^node:async_hooks$/, replacement: path.join(browser, "async-hooks.ts") },
    ],
  },
});
