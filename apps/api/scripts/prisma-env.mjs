import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, "..");
const workspaceDir = path.resolve(apiDir, "../..");

const workspaceEnv = path.join(workspaceDir, ".env");
const apiEnv = path.join(apiDir, ".env");

if (fs.existsSync(workspaceEnv)) {
  dotenv.config({ path: workspaceEnv });
}

if (fs.existsSync(apiEnv)) {
  dotenv.config({ path: apiEnv });
}

const candidateEntrypoints = [
  path.join(apiDir, "node_modules", "prisma", "build", "index.js"),
  path.join(workspaceDir, "node_modules", "prisma", "build", "index.js")
];
const prismaEntrypoint = candidateEntrypoints.find((item) => fs.existsSync(item));

if (!prismaEntrypoint) {
  console.error("Prisma CLI not found. Run npm install first.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [prismaEntrypoint, ...process.argv.slice(2)], {
  cwd: apiDir,
  env: process.env,
  stdio: "inherit",
  shell: false
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
