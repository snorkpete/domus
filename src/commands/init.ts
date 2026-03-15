import { existsSync } from "node:fs";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { projectRoot } from "../lib/jsonl.ts";

const DOMUS_DIRS = [
  ".domus/ideas",
  ".domus/tasks",
  ".domus/specs",
  ".domus/tags",
];

const SEED_FILES: Record<string, string> = {
  ".domus/tags/shared.md": `# Shared Tag Vocabulary

Controlled tag list valid for all entity types (ideas, tasks, etc.). Only use tags from this list.
To add a new tag, add it here first, then use it.

\`backend\`, \`frontend\`, \`infrastructure\`, \`devex\`, \`database\`, \`security\`, \`product\`
`,
  ".domus/tags/ideas.md": `# Idea-Specific Tags

Tags valid only for ideas (in addition to shared tags). Currently empty.
`,
  ".domus/tags/tasks.md": `# Task-Specific Tags

Tags valid only for tasks (in addition to shared tags). Currently empty.
`,
  ".domus/ideas/ideas.jsonl": "",
  ".domus/tasks/tasks.jsonl": "",
};

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
  for (const [relPath, content] of Object.entries(SEED_FILES)) {
    const fullPath = join(projectPath, relPath);
    if (!existsSync(fullPath)) {
      await writeFile(fullPath, content, "utf-8");
      created.push(relPath);
    } else {
      skipped.push(relPath);
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
        `.claude/settings.json contains invalid JSON. Fix or delete it and re-run domus init.`,
      );
    }
    settingsExisted = true;
  }

  const envPath = process.env.PATH;
  if (envPath === undefined) {
    throw new Error("process.env.PATH is not set — cannot configure Claude settings.");
  }

  const domusPermission = await resolveDomusPermission(process.argv[1]);
  const dynamicPermissions = domusPermission
    ? [...REQUIRED_PERMISSIONS, domusPermission]
    : REQUIRED_PERMISSIONS;

  const existingAllow = settings.permissions?.allow ?? [];
  const mergedAllow = [...new Set([...existingAllow, ...dynamicPermissions])];
  settings.permissions = { ...settings.permissions, allow: mergedAllow };
  settings.env = { ...settings.env, PATH: envPath };

  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");

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
