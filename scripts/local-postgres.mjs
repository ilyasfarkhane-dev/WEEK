import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, ".data", "pg");
const port = process.env.PGPORT || "5433";
const user = "gic";
const database = "gic";
const bin =
  process.env.PG_BIN || "C:\\Program Files\\PostgreSQL\\18\\bin";

function exe(name) {
  return path.join(bin, process.platform === "win32" ? `${name}.exe` : name);
}

function run(file, args, opts = {}) {
  execFileSync(file, args, { stdio: "inherit", ...opts });
}

if (!existsSync(exe("initdb"))) {
  console.error(
    `PostgreSQL binaries were not found at ${bin}. Set PG_BIN or install PostgreSQL, or use docker compose.`,
  );
  process.exit(1);
}

mkdirSync(path.dirname(dataDir), { recursive: true });
const secretPath = path.join(root, ".data", "pg-password.txt");

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  const password = randomBytes(18).toString("base64url");
  writeFileSync(secretPath, password, { encoding: "utf8" });
  const pwFile = path.join(root, ".data", "pg-password-init.txt");
  writeFileSync(pwFile, password, { encoding: "utf8" });
  run(exe("initdb"), [
    "-D",
    dataDir,
    "-U",
    user,
    "-A",
    "scram-sha-256",
    "--pwfile",
    pwFile,
    "--encoding",
    "UTF8",
    "--locale",
    "C",
  ]);
  console.log("Initialized a local PostgreSQL cluster.");
}

const password = readFileSync(secretPath, "utf8").trim();
const env = { ...process.env, PGPASSWORD: password };

let running = false;
try {
  execFileSync(exe("pg_ctl"), ["-D", dataDir, "status"], { stdio: "ignore" });
  running = true;
} catch {
  running = false;
}

if (!running) {
  const log = path.join(root, ".data", "pg.log");
  run(exe("pg_ctl"), [
    "-D",
    dataDir,
    "-l",
    log,
    "-o",
    `-p ${port} -h 127.0.0.1`,
    "start",
  ]);
}

const url = `postgresql://${user}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`;

function psql(args) {
  return execFileSync(exe("psql"), ["-h", "127.0.0.1", "-p", port, "-U", user, "-d", "postgres", ...args], {
    env,
    encoding: "utf8",
  });
}

const exists = psql(["-tAc", `SELECT 1 FROM pg_database WHERE datname='${database}'`]).trim();
if (exists !== "1") {
  run(exe("createdb"), ["-h", "127.0.0.1", "-p", port, "-U", user, database], { env });
  console.log(`Created database ${database}.`);
}

const envPath = path.join(root, ".env");
const example = existsSync(path.join(root, ".env.example"))
  ? readFileSync(path.join(root, ".env.example"), "utf8")
  : "";
let current = existsSync(envPath) ? readFileSync(envPath, "utf8") : example;
if (!current.includes("AUTH_SECRET=")) {
  current += `\nAUTH_SECRET=${randomBytes(32).toString("base64")}\n`;
}
if (!current.includes("AUTH_URL=")) current += "AUTH_URL=http://localhost:3000\n";
if (!current.includes("DATABASE_URL=")) current += `DATABASE_URL=${url}\n`;
else current = current.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`);
if (!current.includes("AUTH_SECRET=") || /AUTH_SECRET=\s*$/m.test(current) || current.includes("generate-with")) {
  const secret = randomBytes(32).toString("base64");
  if (/^AUTH_SECRET=.*$/m.test(current)) current = current.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET=${secret}`);
  else current += `AUTH_SECRET=${secret}\n`;
}
writeFileSync(envPath, current.endsWith("\n") ? current : `${current}\n`);
console.log(`Local PostgreSQL is ready on 127.0.0.1:${port}. DATABASE_URL was written to .env.`);
