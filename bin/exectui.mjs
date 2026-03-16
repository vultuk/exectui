#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const entrypoint = join(packageRoot, "src", "index.tsx");
const args = process.argv.slice(2);

const child = spawn("bun", [entrypoint, ...args], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  if ("code" in error && error.code === "ENOENT") {
    console.error("ExecTUI requires Bun to be installed and available on PATH.");
    console.error("Install Bun from https://bun.sh and then rerun `npx exectui`.");
    process.exit(1);
  }

  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
