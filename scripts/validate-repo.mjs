#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCAL_RESOURCE_RE = /(?:references|scripts|tools|config|templates)\/[A-Za-z0-9._/-]+/g;

function parseFrontmatter(source, file, errors) {
  if (!source.startsWith("---\n")) {
    errors.push(`${file}: SKILL.md must start with YAML frontmatter`);
    return { fields: {}, metadata: {}, body: source };
  }

  const end = source.indexOf("\n---\n", 4);
  if (end === -1) {
    errors.push(`${file}: frontmatter closing delimiter is missing`);
    return { fields: {}, metadata: {}, body: source };
  }

  const fields = {};
  const metadata = {};
  let section = null;
  for (const line of source.slice(4, end).split("\n")) {
    const topLevel = line.match(/^([a-z][a-z0-9-]*):(?:\s*(.*))?$/);
    if (topLevel) {
      const [, key, rawValue = ""] = topLevel;
      fields[key] = rawValue.replace(/^(["'])(.*)\1$/, "$2");
      section = key;
      continue;
    }

    const nested = line.match(/^  ([a-z][a-z0-9_-]*):(?:\s*(.*))?$/);
    if (section === "metadata" && nested) {
      const [, key, rawValue = ""] = nested;
      metadata[key] = rawValue.replace(/^(["'])(.*)\1$/, "$2");
    }
  }

  return { fields, metadata, body: source.slice(end + 5) };
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function validateRepo(root) {
  const errors = [];
  const skillsDir = join(root, "skills");
  if (!existsSync(skillsDir)) return ["skills/: directory is missing"];

  const skillNames = sorted(
    readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );

  if (skillNames.length === 0) errors.push("skills/: no skills found");

  for (const directoryName of skillNames) {
    const skillDir = join(skillsDir, directoryName);
    const skillFile = join(skillDir, "SKILL.md");
    const label = relative(root, skillFile);
    if (!existsSync(skillFile)) {
      errors.push(`${label}: file is missing`);
      continue;
    }

    const source = readFileSync(skillFile, "utf8");
    const { fields, metadata, body } = parseFrontmatter(source, label, errors);
    const name = fields.name ?? "";
    const description = fields.description ?? "";

    if (!NAME_RE.test(name) || name.length > 64) {
      errors.push(`${label}: name must be 1-64 lowercase letters, digits, and hyphens`);
    }
    if (name !== directoryName) {
      errors.push(`${label}: frontmatter name "${name}" must match directory name "${directoryName}"`);
    }
    if (!description.trim() || description.length > 1024) {
      errors.push(`${label}: description must be 1-1024 characters`);
    }
    if (/[<>]/.test(description)) {
      errors.push(`${label}: description must not contain angle brackets`);
    }

    const packageFile = join(skillDir, "package.json");
    if (existsSync(packageFile)) {
      try {
        const pkg = JSON.parse(readFileSync(packageFile, "utf8"));
        if (pkg.name !== directoryName) {
          errors.push(`${relative(root, packageFile)}: package name must match directory name`);
        }
        if (metadata.version && pkg.version !== metadata.version) {
          errors.push(`${relative(root, packageFile)}: version must match SKILL.md metadata.version`);
        }
      } catch (error) {
        errors.push(`${relative(root, packageFile)}: invalid JSON (${error.message})`);
      }
    }

    const resources = new Set(body.match(LOCAL_RESOURCE_RE) ?? []);
    for (const resource of resources) {
      if (!existsSync(join(skillDir, resource))) {
        errors.push(`${label}: missing local resource ${resource}`);
      }
    }
  }

  const readmeFile = join(root, "README.md");
  if (!existsSync(readmeFile)) {
    errors.push("README.md: file is missing");
  } else {
    const readme = readFileSync(readmeFile, "utf8");
    const catalog = sorted(
      new Set([...readme.matchAll(/skills\/([a-z0-9-]+)\/SKILL\.md/g)].map((match) => match[1])),
    );
    if (JSON.stringify(catalog) !== JSON.stringify(skillNames)) {
      errors.push(
        `README skill catalog mismatch: expected [${skillNames.join(", ")}], found [${catalog.join(", ")}]`,
      );
    }
  }

  const skillsShFile = join(root, "skills.sh.json");
  if (!existsSync(skillsShFile)) {
    errors.push("skills.sh.json: file is missing");
  } else {
    try {
      const config = JSON.parse(readFileSync(skillsShFile, "utf8"));
      if (config.$schema !== "https://skills.sh/schemas/skills.sh.schema.json") {
        errors.push("skills.sh.json: use the official skills.sh schema URL");
      }
      if (!Array.isArray(config.groupings) || config.groupings.length === 0) {
        errors.push("skills.sh.json: groupings must be a non-empty array");
      } else {
        const grouped = new Set();
        for (const [index, grouping] of config.groupings.entries()) {
          if (typeof grouping.title !== "string" || !grouping.title.trim()) {
            errors.push(`skills.sh.json: grouping ${index + 1} needs a title`);
          }
          if (!Array.isArray(grouping.skills) || grouping.skills.length === 0) {
            errors.push(`skills.sh.json: grouping ${index + 1} needs at least one skill`);
            continue;
          }
          for (const skill of grouping.skills) {
            if (grouped.has(skill)) {
              errors.push(`skills.sh.json: duplicate grouped skill ${skill}`);
            }
            grouped.add(skill);
            if (!skillNames.includes(skill)) {
              errors.push(`skills.sh.json: unknown grouped skill ${skill}`);
            }
          }
        }
        const missing = skillNames.filter((skill) => !grouped.has(skill));
        if (missing.length) {
          errors.push(`skills.sh.json: ungrouped current skills [${missing.join(", ")}]`);
        }
      }
      if (!['top', 'bottom'].includes(config.notGrouped)) {
        errors.push('skills.sh.json: notGrouped must be "top" or "bottom"');
      }
    } catch (error) {
      errors.push(`skills.sh.json: invalid JSON (${error.message})`);
    }
  }

  return errors;
}

function main() {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
  const errors = validateRepo(root);
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  const count = readdirSync(join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).length;
  console.log(`Validated ${count} skills.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
