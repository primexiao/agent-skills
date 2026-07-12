#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const candidates = process.platform === "win32"
  ? [["py", ["-3"]], ["python", []], ["python3", []]]
  : [["python3", []], ["python", []]];

function findPython() {
  for (const [command, prefix] of candidates) {
    const result = spawnSync(command, [...prefix, "--version"], { encoding: "utf8" });
    const version = `${result.stdout ?? ""}${result.stderr ?? ""}`.match(/Python (\d+)\.(\d+)/);
    if (result.status === 0 && version && Number(version[1]) === 3 && Number(version[2]) >= 10) {
      return { command, prefix };
    }
  }
  throw new Error("Python 3.10 or newer is required to run the invest tests");
}

function run(python, args) {
  const result = spawnSync(python.command, [...python.prefix, ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const python = findPython();
run(python, ["-m", "compileall", "-q", "skills/invest/tools"]);
run(python, ["-m", "unittest", "discover", "-s", "tests/invest", "-p", "test_*.py"]);
