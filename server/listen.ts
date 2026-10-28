import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import express from "express";
import { app } from "./index";

const root = process.cwd();
const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);

async function start() {
  if (dev) {
    const { createServer: createVite } = await import("vite");
    const vite = await createVite({ root, server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(root, "dist");
    app.use(express.static(dist));
    app.get(/^(?!\/api\/).*/, async (_request, response) => {
      response.type("html").send(await readFile(path.join(dist, "index.html"), "utf8"));
    });
  }
  app.listen(port, "127.0.0.1", () => {
    console.log(`GIC listening on http://127.0.0.1:${port}`);
  });
}

void start();
