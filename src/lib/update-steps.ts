import { existsSync } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import {
  DOMUS_DIR,
  readDomusConfigSync,
  readJsonl,
  writeJsonl,
} from "./jsonl.ts";
import type { DomusConfig } from "./jsonl.ts";
import type { TaskEntry, TaskStatus } from "./task-types.ts";

// ── Nested .domus guard ───────────────────────────────────────────────────────

/**
 * Throws if `projectPath` is inside a `.domus/` directory.
 * Prevents `domus init` from creating nested `.domus/.domus/` structures.
 */
export function assertNotInsideDomus(projectPath: string): void {
  const absolute = resolve(projectPath);
  const segments = absolute.split(sep);
  if (segments.includes(".domus")) {
    throw new Error(
      `Cannot run \`domus init\` from inside an existing .domus/ directory (detected: ${absolute}).\nRun from the project root instead.`,
    );
  }
}

// ── Folder structure ──────────────────────────────────────────────────────────

const DOMUS_DIRS = [
  ".domus/ideas",
  ".domus/tasks",
  ".domus/tags",
  ".domus/reference",
  ".domus/reference/staff",
  ".domus/reference/staff/roles",
  ".domus/execution-logs",
];

export async function ensureFolderStructure(
  projectPath: string,
): Promise<string[]> {
  const created: string[] = [];
  for (const dir of DOMUS_DIRS) {
    const fullPath = join(projectPath, dir);
    if (!existsSync(fullPath)) {
      await mkdir(fullPath, { recursive: true });
      created.push(`${dir}/`);
    }
  }
  return created;
}

// ── Owned files ───────────────────────────────────────────────────────────────

/**
 * Files that are purely domus-owned: always safe to overwrite on update.
 * These are role files, reference docs, and tag definitions — not user data.
 */
async function buildManagedFiles(): Promise<Record<string, string>> {
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
    ".domus/reference/agent-instructions.md": await Bun.file(
      new URL("../templates/reference/agent-instructions.md", import.meta.url),
    ).text(),
    ".domus/reference/staff/staff.md": await Bun.file(
      new URL("../templates/reference/staff/staff.md", import.meta.url),
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

/**
 * Seed files: written once on init, never overwritten (contain user data).
 */
async function buildSeedFiles(): Promise<Record<string, string>> {
  return {
    ".domus/ideas/ideas.jsonl": await Bun.file(
      new URL("../templates/ideas/ideas.jsonl", import.meta.url),
    ).text(),
    ".domus/tasks/tasks.jsonl": await Bun.file(
      new URL("../templates/tasks/tasks.jsonl", import.meta.url),
    ).text(),
  };
}

export type WriteOwnedFilesOptions = {
  /**
   * When true, always overwrite managed (domus-owned) files with the latest
   * versions from templates. Seed files (user data like tasks.jsonl) are never
   * overwritten — they are only written once on init.
   * When false, all files are skipped if they already exist (init behaviour).
   */
  overwrite: boolean;
};

/**
 * Write domus-owned files (roles, references, tags) and seed files (empty
 * data stores).
 *
 * - `overwrite: false` — skip all existing files (init behaviour).
 * - `overwrite: true` — overwrite managed files (roles, reference, tags)
 *   with latest template versions, but never overwrite seed files
 *   (tasks.jsonl, ideas.jsonl) which contain user data (update behaviour).
 *
 * Returns arrays of created and skipped file paths.
 */
export async function writeOwnedFiles(
  projectPath: string,
  options: WriteOwnedFilesOptions,
): Promise<{ created: string[]; skipped: string[] }> {
  const created: string[] = [];
  const skipped: string[] = [];

  const managedFiles = await buildManagedFiles();
  for (const [relPath, content] of Object.entries(managedFiles)) {
    const fullPath = join(projectPath, relPath);
    if (!options.overwrite && existsSync(fullPath)) {
      skipped.push(relPath);
    } else {
      await writeFile(fullPath, content, "utf-8");
      created.push(relPath);
    }
  }

  // Seed files are always written as "skip if exists" regardless of overwrite flag
  const seedFiles = await buildSeedFiles();
  for (const [relPath, content] of Object.entries(seedFiles)) {
    const fullPath = join(projectPath, relPath);
    if (existsSync(fullPath)) {
      skipped.push(relPath);
    } else {
      await writeFile(fullPath, content, "utf-8");
      created.push(relPath);
    }
  }

  return { created, skipped };
}

// ── Skill syncing ────────────────────────────────────────────────────────────

/**
 * Dynamically discover skill templates and collect their files.
 * Scans src/templates/skills/ for directories containing SKILL.md.
 * Collects SKILL.md and all references/*.md files, skipping preferences.md.
 */
async function buildSkillFiles(): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const skillsDir = new URL("../templates/skills/", import.meta.url);

  let skillNames: string[];
  try {
    skillNames = await readdir(Bun.fileURLToPath(skillsDir));
  } catch {
    return files;
  }

  for (const skillName of skillNames) {
    const skillDir = new URL(`${skillName}/`, skillsDir);
    const skillMdUrl = new URL("SKILL.md", skillDir);
    const skillMdFile = Bun.file(skillMdUrl);

    if (!(await skillMdFile.exists())) {
      continue;
    }

    files[`${skillName}/SKILL.md`] = await skillMdFile.text();

    const refsDir = new URL("references/", skillDir);
    let refEntries: string[];
    try {
      refEntries = await readdir(Bun.fileURLToPath(refsDir));
    } catch {
      continue;
    }

    for (const refFile of refEntries) {
      if (!refFile.endsWith(".md") || refFile === "preferences.md") {
        continue;
      }
      files[`${skillName}/references/${refFile}`] = await Bun.file(
        new URL(refFile, refsDir),
      ).text();
    }
  }

  return files;
}

/**
 * Resolve the target directory for skill installation.
 * - "project" → <projectPath>/.claude/skills/
 * - "user" → ~/.claude/skills/
 * Reads from .domus/config.json skillsTarget field, defaulting to "project".
 */
function resolveSkillsTarget(
  projectPath: string,
  target?: "project" | "user",
): string {
  const resolved =
    target ?? readDomusConfigSync(projectPath)?.skillsTarget ?? "project";
  if (resolved === "user") {
    return join(homedir(), ".claude", "skills");
  }
  return join(projectPath, ".claude", "skills");
}

/**
 * Sync domus skill templates to the target directory.
 * Always overwrites SKILL.md and references/*.md (domus-managed).
 * Never touches preferences.md (user data).
 */
export async function syncSkills(
  projectPath: string,
  options: { target?: "project" | "user" } = {},
): Promise<{ created: string[]; targetDir: string }> {
  const created: string[] = [];
  const targetDir = resolveSkillsTarget(projectPath, options.target);
  const skillFiles = await buildSkillFiles();

  for (const [relPath, content] of Object.entries(skillFiles)) {
    const fullPath = join(targetDir, relPath);
    const dir = join(fullPath, "..");
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(fullPath, content, "utf-8");
    created.push(relPath);
  }

  return { created, targetDir };
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function ensureAuditLog(projectPath: string): Promise<string[]> {
  const created: string[] = [];
  const domusRoot = join(projectPath, DOMUS_DIR);
  const auditPath = join(domusRoot, "audit.jsonl");
  if (!existsSync(auditPath)) {
    await writeFile(auditPath, "", "utf-8");
    created.push(".domus/audit.jsonl");
  }

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
  return created;
}

// ── Claude settings ───────────────────────────────────────────────────────────

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
  const whichPath = which("domus");
  if (whichPath && !whichPath.endsWith(".ts")) {
    return `Bash(${whichPath}:*)`;
  }
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

export async function mergeClaudeSettings(
  projectPath: string,
): Promise<{ verb: string }> {
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
        ".claude/settings.json contains invalid JSON. Fix or delete it and re-run.",
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

  return { verb: settingsExisted ? "updated" : "created" };
}

// ── Branch config ─────────────────────────────────────────────────────────────

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

export async function setBranch(
  projectPath: string,
  branch?: string,
): Promise<string> {
  const resolvedBranch = branch ?? (await resolveGitBranch(projectPath));
  const domusRoot = join(projectPath, DOMUS_DIR);
  await mkdir(domusRoot, { recursive: true });
  const config: DomusConfig = {
    root: projectPath,
    branch: resolvedBranch,
    defaultHiddenTags: ["health-check"],
  };
  await writeFile(
    join(domusRoot, "config.json"),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf-8",
  );
  return resolvedBranch;
}

// ── Config setters ───────────────────────────────────────────────────────────

export async function setSkillsTarget(
  projectPath: string,
  target: "project" | "user",
): Promise<void> {
  // projectPath may already be the .domus/ dir (projectRoot() bug).
  // Detect and avoid nesting.
  const domusRoot = projectPath.endsWith(DOMUS_DIR)
    ? projectPath
    : join(projectPath, DOMUS_DIR);
  await mkdir(domusRoot, { recursive: true });
  const configPath = join(domusRoot, "config.json");

  let config: DomusConfig = { root: projectPath, branch: "main" };
  if (existsSync(configPath)) {
    try {
      const raw = await readFile(configPath, "utf-8");
      config = JSON.parse(raw) as DomusConfig;
    } catch {
      // use default
    }
  }

  config.skillsTarget = target;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

// ── Task schema migration ─────────────────────────────────────────────────────

type LegacyTaskEntry = {
  id: string;
  status: string;
  refinement?: string;
  autonomous?: boolean | unknown;
  [key: string]: unknown;
};

/**
 * Migrate a single JSONL task record from old schema to new schema.
 * Returns `{ migrated: boolean, record: TaskEntry }`.
 */
function migrateTaskRecord(raw: LegacyTaskEntry): {
  migrated: boolean;
  record: TaskEntry;
} {
  // Already on new schema: has `autonomous` as boolean and no `refinement`
  if (typeof raw.autonomous === "boolean" && raw.refinement === undefined) {
    return { migrated: false, record: raw as unknown as TaskEntry };
  }

  const { refinement, ...rest } = raw;
  let newStatus: TaskStatus;
  let autonomous: boolean;

  switch (raw.status) {
    case "open":
      if (refinement === "autonomous") {
        newStatus = "ready";
        autonomous = true;
      } else {
        // "raw" or anything else
        newStatus = "raw";
        autonomous = false;
      }
      break;
    case "done":
      newStatus = "done";
      autonomous = true;
      break;
    case "deferred":
      newStatus = "deferred";
      autonomous = false;
      break;
    default:
      // Unknown status — preserve as-is but still drop refinement
      newStatus = raw.status as TaskStatus;
      autonomous = typeof raw.autonomous === "boolean" ? raw.autonomous : false;
      break;
  }

  const record = {
    ...rest,
    status: newStatus,
    autonomous,
  } as unknown as TaskEntry;

  return { migrated: true, record };
}

/**
 * Migrate a task markdown file's frontmatter from old schema to new schema.
 * Replaces `**Refinement:** autonomous` → `**Autonomous:** true`
 * Replaces `**Refinement:** raw` → `**Autonomous:** false`
 * If `**Autonomous:**` already exists, leaves the file alone.
 * Returns true if the file was modified.
 */
async function migrateTaskMarkdown(filePath: string): Promise<boolean> {
  if (!existsSync(filePath)) return false;
  const content = await readFile(filePath, "utf-8");

  // Already migrated — leave alone
  if (/^\*\*Autonomous:\*\*/m.test(content)) return false;

  let updated = content;
  updated = updated.replace(
    /^\*\*Refinement:\*\* autonomous$/m,
    "**Autonomous:** true",
  );
  updated = updated.replace(
    /^\*\*Refinement:\*\* raw$/m,
    "**Autonomous:** false",
  );

  if (updated === content) return false;
  await writeFile(filePath, updated, "utf-8");
  return true;
}

export async function migrateTaskSchema(projectPath: string): Promise<{
  jsonlMigrated: number;
  mdMigrated: number;
}> {
  const tasksDir = join(projectPath, DOMUS_DIR, "tasks");
  const jsonlPath = join(tasksDir, "tasks.jsonl");

  // Migrate tasks.jsonl
  let jsonlMigrated = 0;
  if (existsSync(jsonlPath)) {
    const records = await readJsonl<LegacyTaskEntry>(jsonlPath);
    const migrated: TaskEntry[] = [];
    for (const record of records) {
      const result = migrateTaskRecord(record);
      if (result.migrated) jsonlMigrated++;
      migrated.push(result.record);
    }
    if (jsonlMigrated > 0) {
      await writeJsonl(jsonlPath, tasksDir, migrated);
    }
  }

  // Migrate individual .md files
  let mdMigrated = 0;
  if (existsSync(tasksDir)) {
    const entries = await readdir(tasksDir);
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const filePath = join(tasksDir, entry);
      const changed = await migrateTaskMarkdown(filePath);
      if (changed) mdMigrated++;
    }
  }

  return { jsonlMigrated, mdMigrated };
}

// ── Idea schema migration (no-op, reserved) ───────────────────────────────────

export async function migrateIdeaSchema(_projectPath: string): Promise<{
  migrated: number;
}> {
  return { migrated: 0 };
}

// ── Config: defaultHiddenTags migration ───────────────────────────────────────

/**
 * Add `defaultHiddenTags: ["health-check"]` to config.json if missing.
 * Idempotent — does not overwrite if the field is already present.
 * Returns true if the config was modified.
 */
export async function migrateDefaultHiddenTags(
  projectPath: string,
): Promise<boolean> {
  const domusRoot = projectPath.endsWith(DOMUS_DIR)
    ? projectPath
    : join(projectPath, DOMUS_DIR);
  const configPath = join(domusRoot, "config.json");

  if (!existsSync(configPath)) {
    return false;
  }

  let config: DomusConfig;
  try {
    const raw = await readFile(configPath, "utf-8");
    config = JSON.parse(raw) as DomusConfig;
  } catch {
    return false;
  }

  if (config.defaultHiddenTags !== undefined) {
    return false;
  }

  config.defaultHiddenTags = ["health-check"];
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
  return true;
}
