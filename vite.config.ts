import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const browser = path.resolve(__dirname, "src/browser");
const storeFile = path.resolve(__dirname, "data/store.json");

function jsonDatabase(): Plugin {
  return {
    name: "gic-json-database",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/store.json") return next();
        if (!existsSync(storeFile)) {
          response.statusCode = 404;
          response.end("{}");
          return;
        }
        response.setHeader("Content-Type", "application/json");
        response.end(readFileSync(storeFile));
      });
    },
    generateBundle() {
      if (!existsSync(storeFile)) return;
      this.emitFile({ type: "asset", fileName: "store.json", source: readFileSync(storeFile) });
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
