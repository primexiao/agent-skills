import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

function markdownFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "cache"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

test("relative markdown links resolve to files in the repository", () => {
  for (const file of markdownFiles(ROOT)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].trim();
      if (/^(?:https?:|mailto:|#)/.test(target)) continue;
      const path = resolve(dirname(file), decodeURIComponent(target.split("#", 1)[0]));
      assert.ok(existsSync(path), `${file} links to missing ${target}`);
    }
  }
});
