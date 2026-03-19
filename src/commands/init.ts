import { existsSync } from "node:fs";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { projectRoot } from "../lib/jsonl.ts";
import type { DomusConfig } from "../lib/jsonl.ts";

const DOMUS_DIRS = [
  ".domus/ideas",
  ".domus/tasks",
  ".domus/specs",
  ".domus/tags",
  ".domus/reference",
  ".domus/reference/staff",
  ".domus/reference/staff/roles",
  ".domus/execution-logs",
];

async function buildSeedFiles(): Promise<Record<string, string>> {
  return {
    ".domus/tags/shared.md": await Bun.file(
      new URL("../templates/tags/shared.md", import.meta.url),
    ).text(),
    ".domus/tags/ideas.md": await Bun.file(
      new URL("../templates/tags/ideas.md", import.meta.url),
    ).text(),
    ".domus/tags/tasks.md": await Bun.file(
      new URL("../templates/tags/tasks.md", import.meta.url),
    ).text(),
    ".domus/ideas/ideas.jsonl": await Bun.file(
      new URL("../templates/ideas/ideas.jsonl", import.meta.url),
    ).text(),
    ".domus/tasks/tasks.jsonl": await Bun.file(
      new URL("../templates/tasks/tasks.jsonl", import.meta.url),
    ).text(),
    ".domus/reference/agent-instructions.md": await Bun.file(
      new URL("../templates/reference/agent-instructions.md", import.meta.url),
    ).text(),
    ".domus/reference/staff/role-activation-rules.md": await Bun.file(
      new URL(
        "../templates/reference/staff/role-activation-rules.md",
        import.meta.url,
      ),
    ).text(),
    ".domus/reference/staff/roles/butler.md": await Bun.file(
      new URL("../templates/reference/staff/roles/butler.md", import.meta.url),
    ).text(),
    ".domus/reference/staff/roles/oracle.md": await Bun.file(
      new URL("../templates/reference/staff/roles/oracle.md", import.meta.url),
    ).text(),
    ".domus/reference/staff/roles/herald.md": await Bun.file(
      new URL("../templates/reference/staff/roles/herald.md", import.meta.url),
    ).text(),
    ".domus/reference/staff/roles/doctor.md": await Bun.file(
      new URL("../templates/reference/staff/roles/doctor.md", import.meta.url),
    ).text(),
    ".domus/reference/staff/roles/taskmaster.md": await Bun.file(
      new URL(
        "../templates/reference/staff/roles/taskmaster.md",
        import.meta.url,
      ),
    ).text(),
    ".domus/reference/staff/roles/worker.md": await Bun.file(
      new URL("../templates/reference/staff/roles/worker.md", import.meta.url),
    ).text(),
    ".domus/reference/staff/roles/foreman.md": await Bun.file(
      new URL("../templates/reference/staff/roles/foreman.md", import.meta.url),
    ).text(),
  };
}

const REQUIRED_PERMISSIONS = [
  "Bash(git *)",
  "Bash(git -C *)",
  "Bash(cd * && git *)",
  "Bash(bun *)",
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
];

type WhichFn = (cmd: string) => string | null;

export async function resolveDomusPermission(
  argv1: string,
  which: WhichFn = Bun.which,
): Promise<string | null> {
  // Primary: find domus in PATH — works for both compiled binaries and bun link installs
  const whichPath = which("domus");
  if (whichPath && !whichPath.endsWith(".ts")) {
    return `Bash(${whichPath}:*)`;
  }

  // Fallback: use argv1 directly (compiled binary not on PATH)
  if (!argv1 || argv1.endsWith(".ts")) return null;
  try {
    const resolved = await realpath(argv1);
    return `Bash(${resolved}:*)`;
  } catch {
    return null;
  }
}

type Settings = {
  permissions?: { allow?: string[] };
  env?: Record<string, string | undefined>;
  [key: string]: unknown;
};

type InitOptions = {
  projectPath?: string;
};

/**
 * Resolve the current git branch for the given project path.
 * Falls back to "main" if git is unavailable or the directory is not a git repo.
 */
async function resolveGitBranch(projectPath: string): Promise<string> {
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: projectPath,
      env: process.env,
    });
    if (result.exitCode === 0) {
      return new TextDecoder().decode(result.stdout).trim();
    }
  } catch {
    // fall through
  }
  return "main";
}

export async function runInit(
  _args: string[],
  options: InitOptions = {},
): Promise<void> {
  const projectPath = options.projectPath ?? projectRoot();
  const created: string[] = [];
  const skipped: string[] = [];

  // Create missing directories
  for (const dir of DOMUS_DIRS) {
    const fullPath = join(projectPath, dir);
    if (!existsSync(fullPath)) {
      await mkdir(fullPath, { recursive: true });
      created.push(`${dir}/`);
    } else {
      skipped.push(`${dir}/`);
    }
  }

  // Create missing seed files
  const seedFiles = await buildSeedFiles();
  for (const [relPath, content] of Object.entries(seedFiles)) {
    const fullPath = join(projectPath, relPath);
    if (!existsSync(fullPath)) {
      await writeFile(fullPath, content, "utf-8");
      created.push(relPath);
    } else {
      skipped.push(relPath);
    }
  }

  // Write .domus/config.json (always overwrite — captures current branch at init time)
  const currentBranch = await resolveGitBranch(projectPath);
  const domusRoot = join(projectPath, ".domus");
  const config: DomusConfig = { root: domusRoot, branch: currentBranch };
  await writeFile(
    join(domusRoot, "config.json"),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf-8",
  );
  created.push(".domus/config.json");

  // Create .domus/audit.jsonl (empty, git-ignored) if it doesn't exist
  const auditPath = join(domusRoot, "audit.jsonl");
  if (!existsSync(auditPath)) {
    await writeFile(auditPath, "", "utf-8");
    created.push(".domus/audit.jsonl");
  } else {
    skipped.push(".domus/audit.jsonl");
  }

  // Ensure audit.jsonl is git-ignored
  const domusGitignorePath = join(domusRoot, ".gitignore");
  const gitignoreEntry = "audit.jsonl\n";
  if (!existsSync(domusGitignorePath)) {
    await writeFile(domusGitignorePath, gitignoreEntry, "utf-8");
    created.push(".domus/.gitignore");
  } else {
    const existing = await readFile(domusGitignorePath, "utf-8");
    if (!existing.includes("audit.jsonl")) {
      await writeFile(domusGitignorePath, existing + gitignoreEntry, "utf-8");
    }
  }

  // Merge .claude/settings.json
  const claudeDir = join(projectPath, ".claude");
  const settingsPath = join(claudeDir, "settings.json");
  await mkdir(claudeDir, { recursive: true });

  let settings: Settings = {};
  let settingsExisted = false;
  if (existsSync(settingsPath)) {
    const raw = await readFile(settingsPath, "utf-8");
    try {
      settings = JSON.parse(raw) as Settings;
    } catch {
      throw new Error(
        ".claude/settings.json contains invalid JSON. Fix or delete it and re-run domus init.",
      );
    }
    settingsExisted = true;
  }

  const envPath = process.env.PATH;
  if (envPath === undefined) {
    throw new Error(
      "process.env.PATH is not set — cannot configure Claude settings.",
    );
  }

  const domusPermission = await resolveDomusPermission(process.argv[1]);
  const dynamicPermissions = domusPermission
    ? [...REQUIRED_PERMISSIONS, domusPermission]
    : REQUIRED_PERMISSIONS;

  const existingAllow = settings.permissions?.allow ?? [];
  const mergedAllow = [...new Set([...existingAllow, ...dynamicPermissions])];
  settings.permissions = { ...settings.permissions, allow: mergedAllow };
  settings.env = { ...settings.env, PATH: envPath };

  await writeFile(
    settingsPath,
    `${JSON.stringify(settings, null, 2)}\n`,
    "utf-8",
  );

  // Report
  if (created.length > 0) {
    console.log("Created:");
    for (const f of created) console.log(`  + ${f}`);
  }
  if (skipped.length > 0) {
    console.log("Already exists (skipped):");
    for (const f of skipped) console.log(`  · ${f}`);
  }
  const settingsVerb = settingsExisted ? "updated" : "created";
  console.log(`  + .claude/settings.json ${settingsVerb} (permissions + PATH)`);
}
