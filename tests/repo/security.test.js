import assert from "node:assert/strict";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SKILLS_DIR = join(ROOT, "skills");

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

test("published skills never replace their own code at runtime", () => {
  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const skillDir = join(SKILLS_DIR, entry.name);
    const skillMd = readFileSync(join(skillDir, "SKILL.md"), "utf8");
    assert.doesNotMatch(skillMd, /self[- ]update/i, `${entry.name} instructs runtime self-update`);

    const scriptsDir = join(skillDir, "scripts");
    if (!existsSync(scriptsDir)) continue;
    const scripts = readdirSync(scriptsDir, { withFileTypes: true, recursive: true })
      .filter((file) => file.isFile())
      .map((file) => file.name);
    assert.ok(!scripts.includes("self-update.js"), `${entry.name} ships self-update.js`);
  }
});

test("published tools do not ship fallback credentials", () => {
  const ashareTool = readFileSync(
    join(SKILLS_DIR, "invest", "tools", "ashare_data.py"),
    "utf8"
  );
  assert.doesNotMatch(
    ashareTool,
    /EASTMONEY_SEARCH_TOKEN[^\n]+\bor\s+["'][A-Fa-f0-9]{32}["']/,
    "Eastmoney search must not fall back to a bundled token"
  );
});

test("published network tools honor the user's proxy policy", () => {
  const toolFiles = [
    join(SKILLS_DIR, "invest", "tools", "ashare_data.py"),
    join(SKILLS_DIR, "invest", "tools", "macro_data.py"),
  ];

  for (const file of toolFiles) {
    assert.doesNotMatch(
      readFileSync(file, "utf8"),
      /--noproxy/,
      `${file} bypasses the configured system proxy`
    );
  }
});

test("published skill payloads contain no symlinks", () => {
  for (const path of walk(SKILLS_DIR)) {
    assert.equal(lstatSync(path).isSymbolicLink(), false, `${path} is a symlink`);
  }
});

test("published executable files contain no embedded secrets or shell execution", () => {
  const executable = walk(SKILLS_DIR).filter((path) => /\.(?:js|mjs|py|json)$/.test(path));
  const credentialAssignment = /(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*["'][^"'\n]{12,}["']/i;
  const unsafeShell = /(?:os\.system\s*\(|shell\s*[:=]\s*true|child_process\.exec\s*\()/i;

  for (const path of executable) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, credentialAssignment, `${path} appears to embed a credential`);
    assert.doesNotMatch(source, unsafeShell, `${path} enables shell command interpretation`);
    assert.doesNotMatch(source, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, `${path} embeds a private key`);
  }
});

test("GitHub Actions are pinned to immutable commit SHAs", () => {
  const workflow = readFileSync(join(ROOT, ".github", "workflows", "ci.yml"), "utf8");
  const actionRefs = [...workflow.matchAll(/uses:\s+[^\s@]+@([^\s#]+)/g)].map((match) => match[1]);

  assert.ok(actionRefs.length > 0, "CI workflow contains no actions");
  for (const ref of actionRefs) {
    assert.match(ref, /^[a-f0-9]{40}$/, `action ref ${ref} is mutable`);
  }
});
