#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const source = argv[0];
  const repoIndex = argv.indexOf("--repo");
  const repo = repoIndex >= 0 ? argv[repoIndex + 1] : null;
  if (!source || !repo) {
    fail("Usage: prepare-publish.js <source-skill-dir> --repo <agent-skills-repo>");
  }
  return { source: resolve(source), repo: resolve(repo) };
}

function parseSkill(path) {
  const skillPath = join(path, "SKILL.md");
  if (!existsSync(skillPath)) fail(`SKILL.md not found: ${skillPath}`);
  const content = readFileSync(skillPath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) fail("SKILL.md must start with YAML frontmatter");
  const scalar = (key) => {
    const raw = match[1].match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"))?.[1]?.trim();
    if (!raw) return null;
    const quote = raw[0];
    return (quote === '"' || quote === "'") && raw.at(-1) === quote ? raw.slice(1, -1) : raw;
  };
  const name = scalar("name");
  const description = scalar("description");
  if (!name || !description) fail("SKILL.md frontmatter requires name and description");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) fail(`Invalid skill name: ${name}`);
  if (basename(path) !== name) fail(`Skill directory must match frontmatter name: ${name}`);
  return { name, description };
}

function purposeFrom(description) {
  return (description.match(/^.*?[.!?](?:\s|$)/)?.[0] || description).trim().replaceAll("|", "\\|");
}

function includePayloadEntry(sourcePath) {
  const name = basename(sourcePath);
  if (new Set([".git", ".DS_Store", "cache", "node_modules", "__pycache__"]).has(name)) return false;
  return !name.endsWith(".log");
}

function renderReadme(path, name, description) {
  if (!existsSync(path)) fail(`README.md not found: ${path}`);
  const install = `npx skills add primexiao/agent-skills --skill ${name}`;
  const row = `| [\`${name}\`](skills/${name}/SKILL.md) | ${purposeFrom(description)} | \`${install}\` |`;
  const content = readFileSync(path, "utf8");
  const lines = content.split("\n");
  const existing = lines.findIndex((line) => line.startsWith(`| [\`${name}\`](`));
  if (existing >= 0) {
    lines[existing] = row;
  } else {
    const header = lines.findIndex((line) => line === "| Skill | Purpose | Install |");
    if (header < 0 || !lines[header + 1]?.startsWith("| ---")) {
      fail("README.md is missing the Skills table");
    }
    let insertAt = header + 2;
    while (insertAt < lines.length && lines[insertAt].startsWith("|")) insertAt += 1;
    lines.splice(insertAt, 0, row);
  }
  return lines.join("\n");
}

function publish(source, repo, skill) {
  const skillsDir = join(repo, "skills");
  if (!existsSync(skillsDir)) fail(`skills directory not found: ${skillsDir}`);
  const readmePath = join(repo, "README.md");
  const readmeContent = renderReadme(readmePath, skill.name, skill.description);
  const destination = join(skillsDir, skill.name);
  const temporary = join(skillsDir, `.${skill.name}.publish-${process.pid}`);
  rmSync(temporary, { recursive: true, force: true });
  cpSync(source, temporary, { recursive: true, filter: includePayloadEntry });
  rmSync(destination, { recursive: true, force: true });
  renameSync(temporary, destination);
  writeFileSync(readmePath, readmeContent);
  return destination;
}

const { source, repo } = parseArgs(process.argv.slice(2));
const skill = parseSkill(source);
mkdirSync(repo, { recursive: true });
const destination = publish(source, repo, skill);
console.log(JSON.stringify({ name: skill.name, source, destination }, null, 2));
