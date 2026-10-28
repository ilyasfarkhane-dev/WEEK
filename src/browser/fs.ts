import schema from "../../prisma/schema.prisma?raw";

const STORE_KEY = "gic.store";
const files = new Map<string, string>();

function isStore(file: string) {
  return file.replace(/\\/g, "/").endsWith("store.json");
}

function isSchema(file: string) {
  return file.replace(/\\/g, "/").endsWith("schema.prisma");
}

export function existsSync(file: string) {
  if (isSchema(file)) return true;
  if (isStore(file)) return Boolean(window.localStorage.getItem(STORE_KEY));
  return files.has(file);
}

export function readFileSync(file: string) {
  if (isSchema(file)) return schema;
  if (isStore(file)) {
    const saved = window.localStorage.getItem(STORE_KEY);
    if (saved !== null) return saved;
  }
  const memory = files.get(file);
  if (memory !== undefined) return memory;
  throw new Error(`Missing file ${file}`);
}

export function writeFileSync(file: string, data: string) {
  if (isStore(file)) {
    window.localStorage.setItem(STORE_KEY, data);
    return;
  }
  files.set(file, data);
}

export function mkdirSync() {}

export function copyFileSync(from: string, to: string) {
  writeFileSync(to, readFileSync(from));
}
