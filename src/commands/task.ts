import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFlag, hasFlag, toKebabCase, uniqueId, validateEnum } from "../lib/args.ts";
import { today, projectRoot, DOMUS_DIR, updateMarkdownStatus } from "../lib/jsonl.ts";
import {
  type TaskEntry,
  type TaskStatus,
  VALID_STATUSES,
  VALID_REFINEMENTS,
  VALID_PRIORITIES,
  readTasks,
  writeTasks,
  doneIds,
  isReady,
  isBlocked,
} from "../lib/task-store.ts";
import { updateBoldField, updateMarkdownTitle, updateSection } from "../lib/markdown.ts";
import {
  ansi,
  sectionHeader,
  formatRow,
  formatAutonomousRow,
  formatBlockedTree,
} from "./task-display.ts";

// ── Subcommands ──────────────────────────────────────────────────────────────

async function cmdAdd(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task add --title <title> [options]");
    console.log(
      "Options: --summary <text> --tags <tag1,tag2> --priority <high|normal|low>",
    );
    console.log(
      "         --refinement <raw|proposed|refined|autonomous> --parent <id> --depends-on <id1,id2>",
    );
    console.log("         --idea <idea-id> --outcome <text> --note <text>");
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
      "         --refinement <raw|proposed|refined|autonomous> --parent <id> --depends-on <id1,id2>",
    );
    console.error("         --idea <idea-id> --outcome <text> --note <text>");
    process.exit(1);
  }

  const summary = parseFlag(args, "--summary") ?? "";
  const tags = parseFlag(args, "--tags")
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];
  const priority = validateEnum(parseFlag(args, "--priority") ?? "normal", VALID_PRIORITIES, "priority");
  const refinement = validateEnum(parseFlag(args, "--refinement") ?? "raw", VALID_REFINEMENTS, "refinement");
  const parentId = parseFlag(args, "--parent") ?? null;
  const dependsOn =
    parseFlag(args, "--depends-on")
      ?.split(",")
      .map((d) => d.trim())
      .filter(Boolean) ?? [];
  const ideaId = parseFlag(args, "--idea") ?? null;
  const outcomeNote = parseFlag(args, "--outcome") ?? null;
  const note = parseFlag(args, "--note");

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
    notes: note ? [note] : [],
    date_status_changed: dateToday,
    date_done: null,
    outcome_note: outcomeNote,
  };

  tasks.push(entry);
  await writeTasks(root, tasks);

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
    console.log("Usage: domus task status <id> <open|in-progress|done|cancelled|deferred> [--outcome <text>]");
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

  if (!VALID_STATUSES.includes(newStatus as TaskStatus)) {
    console.error(
      `Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(", ")}`,
    );
    process.exit(1);
  }

  const outcomeNote = parseFlag(args, "--outcome") ?? null;
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
  if (outcomeNote !== null) {
    task.outcome_note = outcomeNote || null;
  }

  await writeTasks(root, tasks);
  await updateMarkdownStatus(join(root, task.file), newStatus);
  console.log(`Task ${id}: ${oldStatus} → ${newStatus}`);

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
    console.log("Usage: domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>] [--priority <priority>] [--refinement <refinement>] [--depends-on <id1,id2>] [--outcome <text>] [--note <text>] [--parent <id>] [--idea <id>]");
    return;
  }

  const root = projectRoot();
  const [id] = args;

  if (!id) {
    console.error("Usage: domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>] [--priority <priority>] [--refinement <refinement>] [--depends-on <id1,id2>] [--outcome <text>] [--note <text>] [--parent <id>] [--idea <id>]");
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
  const newPriority = parseFlag(args, "--priority");
  const newRefinement = parseFlag(args, "--refinement");
  const newDependsOn = parseFlag(args, "--depends-on");
  const newOutcome = parseFlag(args, "--outcome");
  const newNote = parseFlag(args, "--note");
  const newParent = parseFlag(args, "--parent");
  const newIdea = parseFlag(args, "--idea");

  const hasUpdate = newTitle || newSummary || newTags || newPriority || newRefinement ||
    newDependsOn !== undefined || newOutcome !== undefined || newNote ||
    newParent !== undefined || newIdea !== undefined;

  if (!hasUpdate) {
    console.error("Nothing to update. Provide at least one flag.");
    process.exit(1);
  }

  if (newTitle) task.title = newTitle;
  if (newSummary) task.summary = newSummary;
  if (newTags) task.tags = newTags;
  if (newPriority) task.priority = validateEnum(newPriority, VALID_PRIORITIES, "priority");
  if (newRefinement) task.refinement = validateEnum(newRefinement, VALID_REFINEMENTS, "refinement");
  if (newDependsOn !== undefined) {
    task.depends_on = newDependsOn
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  if (newOutcome !== undefined) task.outcome_note = newOutcome || null;
  if (newNote) task.notes = [...task.notes, newNote];
  if (newParent !== undefined) task.parent_id = newParent || null;
  if (newIdea !== undefined) task.idea_id = newIdea || null;

  await writeTasks(root, tasks);

  const filePath = join(root, task.file);
  if (!existsSync(filePath)) {
    console.warn(`Warning: markdown file not found, JSONL updated but .md not synced: ${filePath}`);
  } else {
    let content = await readFile(filePath, "utf-8");
    if (newTitle) content = updateMarkdownTitle(content, "Task", newTitle);
    if (newPriority) content = updateBoldField(content, "Priority", task.priority);
    if (newRefinement) content = updateBoldField(content, "Refinement", task.refinement);
    if (newDependsOn !== undefined) {
      const depsStr = task.depends_on.length > 0 ? task.depends_on.join(", ") : "none";
      content = updateBoldField(content, "Depends on", depsStr);
    }
    if (newParent !== undefined) content = updateBoldField(content, "Parent", task.parent_id ?? "none");
    if (newIdea !== undefined) content = updateBoldField(content, "Idea", task.idea_id ?? "none");
    if (newSummary) content = updateSection(content, "What This Task Is", newSummary);
    await writeFile(filePath, content, "utf-8");
  }

  console.log(`Task ${id} updated.`);
}

// ── Overview ──────────────────────────────────────────────────────────────────

async function cmdOverview(args: string[]): Promise<void> {
  const includeDone = hasFlag(args, "--include-done");
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

  const autonomous: TaskEntry[] = [];
  const blocked: TaskEntry[] = [];
  const supervised: TaskEntry[] = [];

  for (const t of tasks) {
    if (!visibleStatuses.has(t.status)) continue;

    if (isBlocked(t, done)) {
      blocked.push(t);
    } else if (t.refinement === "autonomous") {
      autonomous.push(t);
    } else {
      supervised.push(t);
    }
  }

  const hasAny = autonomous.length > 0 || blocked.length > 0 || supervised.length > 0;

  if (interval) {
    console.log(ansi("2", `↻ ${interval}s`));
  }

  if (!hasAny) {
    console.log("No tasks to display.");
    return;
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  if (autonomous.length > 0) {
    console.log(sectionHeader("Outstanding - Autonomous"));
    for (const t of autonomous) {
      console.log(formatAutonomousRow(t));
    }
    if (blocked.length > 0 || supervised.length > 0) console.log();
  }

  if (blocked.length > 0) {
    console.log(sectionHeader("Blocked"));
    for (const t of blocked) {
      for (const line of formatBlockedTree(t, done, taskMap)) {
        console.log(line);
      }
    }
    if (supervised.length > 0) console.log();
  }

  if (supervised.length > 0) {
    console.log(sectionHeader("Outstanding - Supervised"));
    for (const t of supervised) {
      console.log(formatRow(t));
    }
  }
}

function cmdWatch(args: string[]): void {
  const watchBin = Bun.which("watch");
  if (!watchBin) {
    console.error("watch not found — install it with: brew install watch");
    process.exit(1);
  }

  const interval = parseFlag(args, "--interval") ?? "10";
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
  domus task status <id> <new-status> [--outcome <text>]
  domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>] [--priority <priority>] [--refinement <refinement>] [--depends-on <id1,id2>] [--outcome <text>] [--note <text>] [--parent <id>] [--idea <id>]
  domus task show <id>
  domus task overview [--include-done]
  domus task ready
  domus task list [--status <status>] [--json]
  domus task watch [--interval <seconds>] [--include-done]

Subcommands:
  add       Create a new task (writes to .domus/tasks/)
  status    Update task status
  update    Update metadata fields (title, summary, tags, priority, refinement, depends-on, outcome, note, parent, idea)
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
