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
    console.log(`${icon} [${t.refinement}] ${t.id} — ${t.title}`);
  });
}

async function cmdShow(args: string[]): Promise<void> {
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
  const root = projectRoot();
  const [id] = args;

  if (!id) {
    console.error("Usage: domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>] [--priority <priority>] [--refinement <refinement>]");
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

  if (!newTitle && !newSummary && !newTags && !newPriority && !newRefinement) {
    console.error("Nothing to update. Provide at least one flag.");
    process.exit(1);
  }

  if (newTitle) task.title = newTitle;
  if (newSummary) task.summary = newSummary;
  if (newTags) task.tags = newTags;
  if (newPriority) task.priority = newPriority;
  if (newRefinement) task.refinement = newRefinement;

  await writeTasks(root, tasks);

  // Sync .md file for fields that appear in the header
  const filePath = join(root, task.file);
  if (existsSync(filePath)) {
    let content = await readFile(filePath, "utf-8");
    if (newTitle) content = content.replace(/^# Task: .+$/m, `# Task: ${newTitle}`);
    if (newPriority) content = content.replace(/^\*\*Priority:\*\* .+$/m, `**Priority:** ${newPriority}`);
    if (newRefinement) content = content.replace(/^\*\*Refinement:\*\* .+$/m, `**Refinement:** ${newRefinement}`);
    await writeFile(filePath, content, "utf-8");
  }

  console.log(`Task ${id} updated.`);
}

// ── Entry point ──────────────────────────────────────────────────────────────

const TASK_USAGE = `
domus task — task management

Usage:
  domus task add --title <title> [options]
  domus task status <id> <new-status> [--note <text>]
  domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>] [--priority <priority>] [--refinement <refinement>]
  domus task show <id>
  domus task ready
  domus task list [--status <status>] [--json]

Subcommands:
  add       Create a new task (writes to .domus/tasks/)
  status    Update task status
  update    Update metadata fields (title, summary, tags, priority, refinement)
  show      Print full detail for a single task
  ready     Show what's ready to work on (grouped by readiness)
  list      List all tasks (--json for machine-readable output)
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
    case "ready":
      await cmdReady(args.slice(1));
      break;
    case "list":
      await cmdList(args.slice(1));
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
