import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFlag, hasFlag, toKebabCase, uniqueId, validateEnum } from "../lib/args.ts";
import {
  today,
  projectRoot,
  DOMUS_DIR,
  readJsonl,
  writeJsonl,
  updateMarkdownStatus,
} from "../lib/jsonl.ts";

// ── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = "open" | "in-progress" | "done" | "cancelled" | "deferred";
type TaskRefinement = "raw" | "refined" | "autonomous";
type TaskPriority = "high" | "normal" | "low";

type TaskEntry = {
  id: string;
  title: string;
  file: string;
  date_captured: string;
  status: TaskStatus;
  refinement: TaskRefinement;
  priority: TaskPriority;
  parent_id: string | null;
  depends_on: string[];
  idea_id: string | null;
  spec_refs: string[];
  tags: string[];
  summary: string;
  date_status_changed: string | null;
  date_done: string | null;
  outcome_note: string | null;
};

// ── Store helpers ─────────────────────────────────────────────────────────────

function tasksJsonlPath(root: string): string {
  return join(root, DOMUS_DIR, "tasks", "tasks.jsonl");
}

function tasksDir(root: string): string {
  return join(root, DOMUS_DIR, "tasks");
}

async function readTasks(root: string): Promise<TaskEntry[]> {
  return readJsonl<TaskEntry>(tasksJsonlPath(root));
}

async function writeTasks(root: string, tasks: TaskEntry[]): Promise<void> {
  return writeJsonl(tasksJsonlPath(root), tasksDir(root), tasks);
}

// ── Computed queries ─────────────────────────────────────────────────────────

function doneIds(tasks: TaskEntry[]): Set<string> {
  return new Set(tasks.filter((t) => t.status === "done").map((t) => t.id));
}

function isReady(task: TaskEntry, done: Set<string>): boolean {
  if (task.status !== "open" && task.status !== "in-progress") return false;
  return task.depends_on.every((dep) => done.has(dep));
}

function isBlocked(task: TaskEntry, done: Set<string>): boolean {
  if (task.status !== "open" && task.status !== "in-progress") return false;
  return task.depends_on.some((dep) => !done.has(dep));
}

// ── Subcommands ──────────────────────────────────────────────────────────────

async function cmdAdd(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task add --title <title> [options]");
    console.log(
      "Options: --summary <text> --tags <tag1,tag2> --priority <high|normal|low>",
    );
    console.log(
      "         --refinement <raw|refined|autonomous> --parent <id> --depends-on <id1,id2>",
    );
    console.log("         --idea <idea-id>");
    return;
  }

  const root = projectRoot();
  const title = parseFlag(args, "--title");
  if (!title) {
    console.error("Usage: domus task add --title <title> [options]");
    console.error(
      "Options: --summary <text> --tags <tag1,tag2> --priority <high|normal|low>",
    );
    console.error(
      "         --refinement <raw|refined|autonomous> --parent <id> --depends-on <id1,id2>",
    );
    console.error("         --idea <idea-id>");
    process.exit(1);
  }

  const summary = parseFlag(args, "--summary") ?? "";
  const tags = parseFlag(args, "--tags")
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];
  const validPriorities: TaskPriority[] = ["high", "normal", "low"];
  const validRefinements: TaskRefinement[] = ["raw", "refined", "autonomous"];
  const priority = validateEnum(parseFlag(args, "--priority") ?? "normal", validPriorities, "priority");
  const refinement = validateEnum(parseFlag(args, "--refinement") ?? "raw", validRefinements, "refinement");
  const parentId = parseFlag(args, "--parent") ?? null;
  const dependsOn =
    parseFlag(args, "--depends-on")
      ?.split(",")
      .map((d) => d.trim())
      .filter(Boolean) ?? [];
  const ideaId = parseFlag(args, "--idea") ?? null;

  const tasks = await readTasks(root);
  const existingIds = tasks.map((t) => t.id);
  const baseId = toKebabCase(title);
  const id = uniqueId(baseId, existingIds);
  const file = `${DOMUS_DIR}/tasks/${id}.md`;
  const dateToday = today();

  const entry: TaskEntry = {
    id,
    title,
    file,
    date_captured: dateToday,
    status: "open",
    refinement,
    priority,
    parent_id: parentId,
    depends_on: dependsOn,
    idea_id: ideaId,
    spec_refs: [],
    tags,
    summary,
    date_status_changed: dateToday,
    date_done: null,
    outcome_note: null,
  };

  tasks.push(entry);
  await writeTasks(root, tasks);

  // Create detail file
  const detailPath = join(root, file);
  const dependsOnStr = dependsOn.length > 0 ? dependsOn.join(", ") : "none";
  const detailContent = `# Task: ${title}

**ID:** ${id}
**Status:** open
**Refinement:** ${refinement}
**Priority:** ${priority}
**Captured:** ${dateToday}
**Parent:** ${parentId ?? "none"}
**Depends on:** ${dependsOnStr}
**Idea:** ${ideaId ?? "none"}
**Spec refs:** none

---

## What This Task Is

${summary || "_No description yet._"}

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
`;

  await writeFile(detailPath, detailContent, "utf-8");
  console.log(`Task created: ${id}`);
  console.log(`  Title:  ${title}`);
  console.log(`  File:   ${file}`);
}

async function cmdStatus(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task status <id> <open|in-progress|done|cancelled|deferred> [--note <text>]");
    return;
  }

  const root = projectRoot();
  const [id, newStatus] = args;

  if (!id || !newStatus) {
    console.error(
      "Usage: domus task status <id> <open|in-progress|done|cancelled|deferred>",
    );
    process.exit(1);
  }

  const validStatuses: TaskStatus[] = [
    "open",
    "in-progress",
    "done",
    "cancelled",
    "deferred",
  ];
  if (!validStatuses.includes(newStatus as TaskStatus)) {
    console.error(
      `Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(", ")}`,
    );
    process.exit(1);
  }

  const outcomeNote = parseFlag(args, "--note") ?? null;
  const tasks = await readTasks(root);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }

  const oldStatus = task.status;
  task.status = newStatus as TaskStatus;
  task.date_status_changed = today();

  if (newStatus === "done") {
    task.date_done = today();
  }
  if (outcomeNote) {
    task.outcome_note = outcomeNote;
  }

  await writeTasks(root, tasks);
  await updateMarkdownStatus(join(root, task.file), newStatus);
  console.log(`Task ${id}: ${oldStatus} → ${newStatus}`);

  // Surface parent completion hint
  if (newStatus === "done" && task.parent_id) {
    const siblings = tasks.filter((t) => t.parent_id === task.parent_id);
    const allDone = siblings.every(
      (t) => t.id === id || t.status === "done",
    );
    if (allDone) {
      const parent = tasks.find((t) => t.id === task.parent_id);
      const parentTitle = parent ? `"${parent.title}"` : task.parent_id;
      console.log(
        `\nAll subtasks of ${parentTitle} are now complete — should I mark the parent done?`,
      );
    }
  }
}

async function cmdReady(_args: string[]): Promise<void> {
  const root = projectRoot();
  const tasks = await readTasks(root);

  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  const done = doneIds(tasks);
  const inProgress = tasks.filter((t) => t.status === "in-progress");
  const readyAutonomous = tasks.filter(
    (t) =>
      t.status === "open" && t.refinement === "autonomous" && isReady(t, done),
  );
  const readySupervised = tasks.filter(
    (t) =>
      t.status === "open" && t.refinement !== "autonomous" && isReady(t, done),
  );
  const blocked = tasks.filter((t) => isBlocked(t, done));

  const fmt = (t: TaskEntry) =>
    `  [${t.priority}] ${t.id} — ${t.title}${t.summary ? `\n      ${t.summary}` : ""}`;

  if (inProgress.length > 0) {
    console.log("## In Progress\n");
    inProgress.forEach((t) => console.log(fmt(t)));
    console.log();
  }

  if (readyAutonomous.length > 0) {
    console.log("## Ready (Autonomous)\n");
    readyAutonomous.forEach((t) => console.log(fmt(t)));
    console.log();
  }

  if (readySupervised.length > 0) {
    console.log("## Ready (Supervised)\n");
    readySupervised.forEach((t) => console.log(fmt(t)));
    console.log();
  }

  if (blocked.length > 0) {
    console.log("## Blocked\n");
    blocked.forEach((t) => {
      const waiting = t.depends_on.filter((dep) => !done.has(dep));
      console.log(`  ${t.id} — ${t.title} (waiting on: ${waiting.join(", ")})`);
    });
    console.log();
  }

  if (
    inProgress.length === 0 &&
    readyAutonomous.length === 0 &&
    readySupervised.length === 0 &&
    blocked.length === 0
  ) {
    console.log("No open tasks.");
  }
}

async function cmdList(args: string[]): Promise<void> {
  const root = projectRoot();
  const tasks = await readTasks(root);

  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  const filterStatus = parseFlag(args, "--status") as TaskStatus | undefined;
  const filtered = filterStatus
    ? tasks.filter((t) => t.status === filterStatus)
    : tasks;

  if (hasFlag(args, "--json")) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  const statusIcon: Record<TaskStatus, string> = {
    open: "○",
    "in-progress": "◑",
    done: "●",
    cancelled: "✕",
    deferred: "⏸",
  };

  filtered.forEach((t) => {
    const icon = statusIcon[t.status] ?? "?";
    console.log(`${icon} [${t.refinement}] [${t.priority}] ${t.id} — ${t.title}`);
  });
}

async function cmdShow(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task show <id>");
    return;
  }

  const root = projectRoot();
  const [id] = args;

  if (!id) {
    console.error("Usage: domus task show <id>");
    process.exit(1);
  }

  const tasks = await readTasks(root);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }

  console.log(`# ${task.title}`);
  console.log();
  console.log(`ID:          ${task.id}`);
  console.log(`Status:      ${task.status}`);
  console.log(`Refinement:  ${task.refinement}`);
  console.log(`Priority:    ${task.priority}`);
  console.log(`Captured:    ${task.date_captured}`);
  console.log(`Parent:      ${task.parent_id ?? "none"}`);
  console.log(`Depends on:  ${task.depends_on.length > 0 ? task.depends_on.join(", ") : "none"}`);
  console.log(`Idea:        ${task.idea_id ?? "none"}`);
  console.log(`Tags:        ${task.tags.length > 0 ? task.tags.join(", ") : "none"}`);
  console.log(`Summary:     ${task.summary || "(none)"}`);
  if (task.outcome_note) console.log(`Outcome:     ${task.outcome_note}`);
}

async function cmdUpdate(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>] [--priority <priority>] [--refinement <refinement>] [--depends-on <id1,id2>] [--note <text>] [--parent <id>] [--idea <id>]");
    return;
  }

  const root = projectRoot();
  const [id] = args;

  if (!id) {
    console.error("Usage: domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>] [--priority <priority>] [--refinement <refinement>] [--depends-on <id1,id2>] [--note <text>] [--parent <id>] [--idea <id>]");
    process.exit(1);
  }

  const tasks = await readTasks(root);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }

  const newTitle = parseFlag(args, "--title");
  const newSummary = parseFlag(args, "--summary");
  const newTags = parseFlag(args, "--tags")?.split(",").map((t) => t.trim()).filter(Boolean);
  const newPriority = parseFlag(args, "--priority") as TaskPriority | undefined;
  const newRefinement = parseFlag(args, "--refinement") as TaskRefinement | undefined;
  const newDependsOn = parseFlag(args, "--depends-on");
  const newNote = parseFlag(args, "--note");
  const newParent = parseFlag(args, "--parent");
  const newIdea = parseFlag(args, "--idea");

  if (!newTitle && !newSummary && !newTags && !newPriority && !newRefinement && newDependsOn === undefined && !newNote && newParent === undefined && newIdea === undefined) {
    console.error("Nothing to update. Provide at least one flag.");
    process.exit(1);
  }

  if (newTitle) task.title = newTitle;
  if (newSummary) task.summary = newSummary;
  if (newTags) task.tags = newTags;
  if (newPriority) task.priority = newPriority;
  if (newRefinement) task.refinement = newRefinement;
  if (newDependsOn !== undefined) {
    task.depends_on = newDependsOn
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  if (newNote) task.outcome_note = newNote;
  if (newParent !== undefined) task.parent_id = newParent || null;
  if (newIdea !== undefined) task.idea_id = newIdea || null;

  await writeTasks(root, tasks);

  // Sync .md file for fields that appear in the header
  const filePath = join(root, task.file);
  if (existsSync(filePath)) {
    let content = await readFile(filePath, "utf-8");
    if (newTitle) content = content.replace(/^# Task: .+$/m, `# Task: ${newTitle}`);
    if (newPriority) content = content.replace(/^\*\*Priority:\*\* .+$/m, `**Priority:** ${newPriority}`);
    if (newRefinement) content = content.replace(/^\*\*Refinement:\*\* .+$/m, `**Refinement:** ${newRefinement}`);
    if (newDependsOn !== undefined) {
      const depsStr = task.depends_on.length > 0 ? task.depends_on.join(", ") : "none";
      content = content.replace(/^\*\*Depends on:\*\* .+$/m, `**Depends on:** ${depsStr}`);
    }
    if (newParent !== undefined) {
      content = content.replace(/^\*\*Parent:\*\* .+$/m, `**Parent:** ${task.parent_id ?? "none"}`);
    }
    if (newIdea !== undefined) {
      content = content.replace(/^\*\*Idea:\*\* .+$/m, `**Idea:** ${task.idea_id ?? "none"}`);
    }
    await writeFile(filePath, content, "utf-8");
  }

  console.log(`Task ${id} updated.`);
}

// ── Overview ──────────────────────────────────────────────────────────────────

function ansi(code: string, text: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

const PRIORITY_ICON: Record<TaskPriority, string> = {
  high: "▲",
  normal: "·",
  low: "▼",
};

const STATUS_ICON: Record<string, string> = {
  open: "○",
  "in-progress": "◑",
  done: "●",
  cancelled: "✕",
  deferred: "⏸",
  blocked: "⊘",
};

const REFINEMENT_ICON: Record<string, string> = {
  raw: "~",
  refined: "◎",
};

function priorityAnsi(icon: string, priority: TaskPriority): string {
  if (priority === "high") return ansi("33;1", icon); // yellow bold
  if (priority === "low") return ansi("2", icon);     // dim
  return icon;
}

function statusAnsi(icon: string, status: TaskStatus): string {
  if (status === "in-progress") return ansi("36", icon); // cyan
  if (status === "done") return ansi("32", icon);        // green
  if (status === "cancelled") return ansi("2", icon);    // dim
  return icon;
}

function lineAnsi(line: string, status: TaskStatus): string {
  const code = status === "in-progress" ? "36" : status === "done" ? "2" : null;
  if (!code) return line;
  // Re-apply the line color after every inner reset so nested icon codes don't break it
  const reapply = `\x1b[0m\x1b[${code}m`;
  return `\x1b[${code}m${line.replace(/\x1b\[0m/g, reapply)}\x1b[0m`;
}

function sectionHeader(label: string): string {
  const line = "─".repeat(48 - label.length - 4);
  return ansi("2", `── ${label} ${line}`);
}

async function cmdOverview(args: string[]): Promise<void> {
  const includeDone = hasFlag(args, "--include-done");
  const includeBlocked = hasFlag(args, "--blocked");
  const interval = parseFlag(args, "--interval");

  const root = projectRoot();
  const tasks = await readTasks(root);

  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  const done = doneIds(tasks);

  const visibleStatuses = new Set<TaskStatus>(["open", "in-progress"]);
  if (includeDone) visibleStatuses.add("done");

  // Separate blocked from unblocked for default display
  const supervised: TaskEntry[] = [];
  const autonomous: TaskEntry[] = [];

  for (const t of tasks) {
    if (!visibleStatuses.has(t.status)) continue;

    const blocked = isBlocked(t, done);
    if (blocked && !includeBlocked) continue;

    if (t.refinement === "autonomous") {
      autonomous.push(t);
    } else {
      supervised.push(t);
    }
  }

  const hasAny = supervised.length > 0 || autonomous.length > 0;

  if (interval) {
    console.log(ansi("2", `↻ ${interval}s`));
  }

  if (!hasAny) {
    console.log("No tasks to display.");
    return;
  }

  function formatSupervised(t: TaskEntry): string {
    const pIcon = priorityAnsi(PRIORITY_ICON[t.priority] ?? "·", t.priority);
    const rIcon = REFINEMENT_ICON[t.refinement] ?? "?";
    const sIcon = statusAnsi(STATUS_ICON[t.status] ?? "?", t.status);
    const blockedSuffix = includeBlocked && isBlocked(t, done)
      ? ansi("33", ` ⊘ waiting on: ${t.depends_on.filter((d) => !done.has(d)).join(", ")}`)
      : "";
    return lineAnsi(`${pIcon} ${rIcon} ${sIcon}  ${t.id}${blockedSuffix}`, t.status);
  }

  function formatAutonomous(t: TaskEntry): string {
    const pIcon = priorityAnsi(PRIORITY_ICON[t.priority] ?? "·", t.priority);
    const sIcon = statusAnsi(STATUS_ICON[t.status] ?? "?", t.status);
    const blockedSuffix = includeBlocked && isBlocked(t, done)
      ? ansi("33", ` ⊘ waiting on: ${t.depends_on.filter((d) => !done.has(d)).join(", ")}`)
      : "";
    return lineAnsi(`${pIcon} ${sIcon}  ${t.id}${blockedSuffix}`, t.status);
  }

  if (supervised.length > 0) {
    console.log(sectionHeader("Outstanding - Supervised"));
    for (const t of supervised) {
      console.log(formatSupervised(t));
    }
    if (autonomous.length > 0) console.log();
  }

  if (autonomous.length > 0) {
    console.log(sectionHeader("Outstanding - Autonomous"));
    for (const t of autonomous) {
      console.log(formatAutonomous(t));
    }
  }
}

function cmdWatch(args: string[]): void {
  const watchBin = Bun.which("watch");
  if (!watchBin) {
    console.error("watch not found — install it with: brew install watch");
    process.exit(1);
  }

  const interval = parseFlag(args, "--interval") ?? "15";
  const passthroughArgs = args.filter((a, i) => a !== "--interval" && args[i - 1] !== "--interval");
  const domusBin = Bun.which("domus") ?? "domus";
  const result = Bun.spawnSync(
    [watchBin, "-c", "-t", "-n", interval, domusBin, "task", "overview", "--interval", interval, ...passthroughArgs],
    { stdio: ["inherit", "inherit", "inherit"] },
  );
  process.exit(result.exitCode ?? 0);
}

// ── Entry point ──────────────────────────────────────────────────────────────

const TASK_USAGE = `
domus task — task management

Usage:
  domus task add --title <title> [options]
  domus task status <id> <new-status> [--note <text>]
  domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>] [--priority <priority>] [--refinement <refinement>] [--note <text>] [--parent <id>] [--idea <id>]
  domus task show <id>
  domus task overview [--include-done] [--blocked]
  domus task ready
  domus task list [--status <status>] [--json]
  domus task watch [--interval <seconds>] [--include-done] [--blocked]

Subcommands:
  add       Create a new task (writes to .domus/tasks/)
  status    Update task status
  update    Update metadata fields (title, summary, tags, priority, refinement, note, parent, idea)
  show      Print full detail for a single task
  overview  Compact watch-friendly overview grouped by Supervised / Autonomous
  ready     Show what's ready to work on (grouped by readiness)
  list      List all tasks (--json for machine-readable output)
  watch     Live-refresh overview via watch(1) (pass extra args through)
`.trim();

export async function runTask(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case "add":
      await cmdAdd(args.slice(1));
      break;
    case "status":
      await cmdStatus(args.slice(1));
      break;
    case "update":
      await cmdUpdate(args.slice(1));
      break;
    case "show":
      await cmdShow(args.slice(1));
      break;
    case "overview":
      await cmdOverview(args.slice(1));
      break;
    case "ready":
      await cmdReady(args.slice(1));
      break;
    case "list":
      await cmdList(args.slice(1));
      break;
    case "watch":
      cmdWatch(args.slice(1));
      break;
    case "--help":
    case "-h":
    case undefined:
      console.log(TASK_USAGE);
      break;
    default:
      console.error(`Unknown task subcommand: ${sub}`);
      console.error("Run `domus task --help` for usage.");
      process.exit(1);
  }
}
