#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function readJson(root, file, errors) {
  if (!existsSync(file)) {
    errors.push(`${relative(root, file)}: file is missing`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${relative(root, file)}: invalid JSON (${error.message})`);
    return null;
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateEvals(root) {
  const errors = [];
  const skillsDir = join(root, "skills");
  if (!existsSync(skillsDir)) return ["skills/: directory is missing"];

  const skills = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const skill of skills) {
    const behaviorFile = join(root, "evals", skill, "evals.json");
    const behavior = readJson(root, behaviorFile, errors);
    if (behavior) {
      if (behavior.skill_name !== skill) {
        errors.push(`${relative(root, behaviorFile)}: skill_name must be "${skill}"`);
      }
      if (!Array.isArray(behavior.evals)) {
        errors.push(`${relative(root, behaviorFile)}: evals must be an array`);
      } else {
        if (behavior.evals.length < 3) {
        errors.push(`${relative(root, behaviorFile)}: at least 3 behavior evals are required`);
        }
        const ids = new Set();
        for (const item of behavior.evals) {
          if (!Number.isInteger(item.id)) {
            errors.push(`${relative(root, behaviorFile)}: eval id must be an integer`);
          } else if (ids.has(item.id)) {
            errors.push(`${relative(root, behaviorFile)}: duplicate eval id ${item.id}`);
          }
          ids.add(item.id);
          if (!nonEmptyString(item.prompt) || !nonEmptyString(item.expected_output)) {
            errors.push(`${relative(root, behaviorFile)}: eval ${item.id} needs prompt and expected_output`);
          }
          if (!Array.isArray(item.expectations) || item.expectations.length === 0 ||
              item.expectations.some((value) => !nonEmptyString(value))) {
            errors.push(`${relative(root, behaviorFile)}: eval ${item.id} needs non-empty expectations`);
          }
        }
      }
    }

    const routingFile = join(root, "evals", "routing", `${skill}.json`);
    const routing = readJson(root, routingFile, errors);
    if (routing) {
      if (!Array.isArray(routing)) {
        errors.push(`${relative(root, routingFile)}: routing cases must be an array`);
      } else {
        if (routing.length < 6) {
        errors.push(`${relative(root, routingFile)}: at least 6 routing cases are required`);
        }
        const queries = new Set();
        let positives = 0;
        let negatives = 0;
        for (const item of routing) {
          if (!nonEmptyString(item.query) || typeof item.should_trigger !== "boolean") {
            errors.push(`${relative(root, routingFile)}: every case needs query and should_trigger`);
            continue;
          }
          if (queries.has(item.query)) {
            errors.push(`${relative(root, routingFile)}: duplicate query "${item.query}"`);
          }
          queries.add(item.query);
          if (item.should_trigger) positives += 1;
          else negatives += 1;
        }
        if (positives === 0 || negatives === 0) {
          errors.push(`${relative(root, routingFile)}: routing set needs positive and negative cases`);
        }
      }
    }
  }

  return errors;
}

function main() {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
  const errors = validateEvals(root);
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("Validated behavior and routing evals for every skill.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
