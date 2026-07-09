import { spawnSync } from "child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "fs";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(SCRIPT_DIR, "..");
const PACKAGE_PATH = join(SKILL_DIR, "package.json");
const CACHE_DIR = join(SKILL_DIR, "cache");
const STATE_PATH = join(CACHE_DIR, "self-update-state.json");
const DEFAULT_BRANCH = process.env.TOPIC_SKILL_UPDATE_REF || "main";
const AUTO_UPDATE_OFF = new Set(["0", "false", "off", "no"]);
const REQUIRED_FILES = [
  "SKILL.md",
  "package.json",
  "scripts/self-update.js",
  "references/init.md",
  "references/new-topic.md",
  "references/lint.md",
  "templates/AGENTS.template.md",
  "templates/topic-README.template.md"
];
const DATA_CACHE_FILES = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
    ...options
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
  return (result.stdout || "").trim();
}

function warn(message) {
  console.error(`[warn] topic self-update: ${message}`);
}

function packageInfo() {
  const pkg = readJson(PACKAGE_PATH);
  const repo = pkg.repository || {};
  const directory = repo.directory || "";
  const url = typeof repo === "string" ? repo : repo.url;
  if (!url || !directory) {
    throw new Error("package.json repository.url and repository.directory are required");
  }
  return { pkg, repoUrl: url, directory };
}

function parseGithubRepo(repoUrl) {
  const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "application/vnd.github+json",
      "user-agent": "topic-self-update"
    },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

async function getRemoteRevision(repoUrl, directory) {
  const github = parseGithubRepo(repoUrl);
  if (github) {
    try {
      const url = `https://api.github.com/repos/${github.owner}/${github.repo}/commits/${DEFAULT_BRANCH}?path=${encodeURIComponent(directory)}`;
      const data = await fetchJson(url);
      if (data?.sha) {
        return {
          revision: data.sha,
          source: "github-api",
          ref: DEFAULT_BRANCH
        };
      }
    } catch (err) {
      warn(`GitHub API check failed, falling back to git: ${err instanceof Error ? err.message : err}`);
    }
  }

  const output = run("git", ["ls-remote", repoUrl, DEFAULT_BRANCH]);
  const revision = output.split(/\s+/)[0];
  if (!revision) throw new Error(`Could not resolve remote ref ${DEFAULT_BRANCH}`);
  return {
    revision,
    source: "git-ls-remote",
    ref: DEFAULT_BRANCH
  };
}

function readState() {
  try {
    if (!existsSync(STATE_PATH)) return {};
    return readJson(STATE_PATH);
  } catch {
    return {};
  }
}

function writeState(patch) {
  const next = {
    ...readState(),
    ...patch,
    updated_at: new Date().toISOString()
  };
  writeJson(STATE_PATH, next);
}

function ttlHours() {
  const raw = process.env.TOPIC_SKILL_AUTO_UPDATE_TTL_HOURS || "24";
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 24;
}

function isCheckFresh(state) {
  if (!state.last_checked_at) return false;
  const ageMs = Date.now() - new Date(state.last_checked_at).getTime();
  return Number.isFinite(ageMs) && ageMs < ttlHours() * 60 * 60 * 1000;
}

function gitRootFor(path) {
  try {
    return run("git", ["-C", path, "rev-parse", "--show-toplevel"]);
  } catch {
    return null;
  }
}

function repoRemoteMatches(repoUrl, root) {
  try {
    const origin = run("git", ["-C", root, "remote", "get-url", "origin"]);
    return normalizeGitUrl(origin) === normalizeGitUrl(repoUrl);
  } catch {
    return false;
  }
}

function normalizeGitUrl(url) {
  return url
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
}

function isSourceCheckout(repoUrl, directory) {
  const root = gitRootFor(SKILL_DIR);
  if (!root) return false;
  const rel = relative(root, SKILL_DIR).replaceAll("\\", "/");
  return rel === directory && repoRemoteMatches(repoUrl, root);
}

function hasLocalChanges() {
  const root = gitRootFor(SKILL_DIR);
  if (!root) return false;
  const rel = relative(root, SKILL_DIR);
  try {
    return run("git", ["-C", root, "status", "--porcelain", "--", rel]) !== "";
  } catch {
    return false;
  }
}

function tempRoot() {
  const root = process.env.TMPDIR || "/tmp";
  return join(root, `topic-update-${process.pid}-${Date.now()}`);
}

function downloadSkill(repoUrl, directory, revision) {
  const root = tempRoot();
  const repoDir = join(root, "repo");
  mkdirSync(root, { recursive: true });
  try {
    run("git", ["clone", "--depth", "1", "--filter=blob:none", "--sparse", "--branch", DEFAULT_BRANCH, repoUrl, repoDir]);
    run("git", ["-C", repoDir, "sparse-checkout", "set", directory]);
    if (revision) {
      const actual = run("git", ["-C", repoDir, "rev-parse", "HEAD"]);
      if (revision.length >= 40 && actual !== revision) {
        warn(`downloaded HEAD ${actual.slice(0, 12)} differs from checked revision ${revision.slice(0, 12)}`);
      }
    }
    return {
      root,
      skillDir: join(repoDir, directory)
    };
  } catch (err) {
    rmSync(root, { recursive: true, force: true });
    throw err;
  }
}

function validateDownloadedSkill(path) {
  for (const file of REQUIRED_FILES) {
    if (!existsSync(join(path, file))) {
      throw new Error(`downloaded skill is missing ${file}`);
    }
  }
  const pkg = readJson(join(path, "package.json"));
  if (pkg.name !== "topic") {
    throw new Error(`downloaded package name mismatch: ${pkg.name}`);
  }
}

function removeReplaceableEntries(path) {
  for (const entry of readdirSync(path)) {
    if (entry === "cache" || entry === ".git") continue;
    rmSync(join(path, entry), { recursive: true, force: true });
  }
}

function copyEntries(from, to) {
  for (const entry of readdirSync(from)) {
    if (entry === "cache" || entry === ".git") continue;
    cpSync(join(from, entry), join(to, entry), { recursive: true });
  }
}

function backupCurrentSkill() {
  const root = tempRoot();
  const backupDir = join(root, "backup");
  mkdirSync(backupDir, { recursive: true });
  copyEntries(SKILL_DIR, backupDir);
  return { root, backupDir };
}

function restoreBackup(backupDir) {
  removeReplaceableEntries(SKILL_DIR);
  copyEntries(backupDir, SKILL_DIR);
}

function clearDataCache() {
  const cleared = [];
  for (const file of DATA_CACHE_FILES) {
    const path = join(CACHE_DIR, file);
    if (!existsSync(path)) continue;
    try {
      rmSync(path, { force: true });
      cleared.push(file);
    } catch (err) {
      warn(`could not clear cache/${file}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return cleared;
}

function localVersion() {
  try {
    const pkg = readJson(PACKAGE_PATH);
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
}

async function check() {
  const { repoUrl, directory } = packageInfo();
  const remote = await getRemoteRevision(repoUrl, directory);
  const state = readState();
  writeState({
    last_checked_at: new Date().toISOString(),
    last_remote_revision: remote.revision,
    last_remote_source: remote.source
  });
  return {
    command: "check",
    skill_dir: SKILL_DIR,
    local_version: localVersion(),
    remote_revision: remote.revision,
    remote_source: remote.source,
    remote_ref: remote.ref,
    applied_revision: state.applied_revision || null,
    update_available: state.applied_revision !== remote.revision
  };
}

async function applyUpdate(options = {}) {
  const { repoUrl, directory } = packageInfo();
  if (hasLocalChanges()) {
    return { command: "apply", status: "skipped", reason: "local_changes" };
  }

  const remote = options.remote || await getRemoteRevision(repoUrl, directory);
  const downloaded = downloadSkill(repoUrl, directory, remote.revision);
  const backup = backupCurrentSkill();
  let cleared = [];
  try {
    validateDownloadedSkill(downloaded.skillDir);
    removeReplaceableEntries(SKILL_DIR);
    copyEntries(downloaded.skillDir, SKILL_DIR);
    writeState({
      applied_revision: remote.revision,
      applied_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
      last_remote_revision: remote.revision,
      last_remote_source: remote.source
    });
    cleared = clearDataCache();
    return {
      command: "apply",
      status: "updated",
      revision: remote.revision,
      source: remote.source,
      cache_cleared: cleared
    };
  } catch (err) {
    try {
      restoreBackup(backup.backupDir);
    } catch (restoreErr) {
      warn(`rollback failed: ${restoreErr instanceof Error ? restoreErr.message : restoreErr}`);
    }
    return {
      command: "apply",
      status: "failed",
      error: err instanceof Error ? err.message : String(err)
    };
  } finally {
    rmSync(downloaded.root, { recursive: true, force: true });
    rmSync(backup.root, { recursive: true, force: true });
  }
}

async function auto() {
  const autoEnv = (process.env.TOPIC_SKILL_AUTO_UPDATE || "").toLowerCase();
  if (AUTO_UPDATE_OFF.has(autoEnv)) return { command: "auto", status: "skipped", reason: "disabled" };

  const { repoUrl, directory } = packageInfo();
  if (isSourceCheckout(repoUrl, directory) && process.env.TOPIC_SKILL_AUTO_UPDATE_SOURCE !== "1") {
    return { command: "auto", status: "skipped", reason: "source_checkout" };
  }
  if (hasLocalChanges()) return { command: "auto", status: "skipped", reason: "local_changes" };

  const state = readState();
  if (isCheckFresh(state)) return { command: "auto", status: "skipped", reason: "ttl" };

  const remote = await getRemoteRevision(repoUrl, directory);
  writeState({
    last_checked_at: new Date().toISOString(),
    last_remote_revision: remote.revision,
    last_remote_source: remote.source
  });
  if (state.applied_revision === remote.revision) {
    return { command: "auto", status: "current", revision: remote.revision };
  }

  return await applyUpdate({ remote });
}

function status() {
  const { repoUrl, directory } = packageInfo();
  return {
    command: "status",
    skill_dir: SKILL_DIR,
    repository: repoUrl,
    directory,
    local_version: localVersion(),
    state: readState(),
    source_checkout: isSourceCheckout(repoUrl, directory),
    local_changes: hasLocalChanges(),
    auto_update: !AUTO_UPDATE_OFF.has((process.env.TOPIC_SKILL_AUTO_UPDATE || "").toLowerCase()),
    ttl_hours: ttlHours()
  };
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const command = process.argv[2] || "status";
  try {
    switch (command) {
      case "status":
        printJson(status());
        break;
      case "check":
        printJson(await check());
        break;
      case "apply":
        printJson(await applyUpdate());
        break;
      case "auto": {
        const result = await auto();
        if (result.status === "updated") {
          console.error(`TOPIC_SKILL_UPDATED revision=${result.revision?.slice(0, 12)} cache_cleared=${(result.cache_cleared || []).join(",")}`);
        } else if (result.status === "failed") {
          warn(`update failed: ${result.error}`);
        } else if (result.status === "skipped" && result.reason === "local_changes") {
          warn("skipped because local skill files have uncommitted changes");
        }
        break;
      }
      default:
        throw new Error(`Unknown command: ${command}. Use status, check, apply, or auto.`);
    }
  } catch (err) {
    if (command === "auto") {
      warn(err instanceof Error ? err.message : String(err));
      process.exit(0);
    }
    console.error(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2));
    process.exit(1);
  }
}

main();
