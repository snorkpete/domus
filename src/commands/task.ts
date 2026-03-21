import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  hasFlag,
  parseFlag,
  toKebabCase,
  uniqueId,
  validateEnum,
} from "../lib/args.ts";
import {
  DOMUS_DIR,
  projectRoot,
  today,
  updateMarkdownStatus,
} from "../lib/jsonl.ts";
import {
  updateBoldField,
  updateMarkdownTitle,
  updateSection,
} from "../lib/markdown.ts";
import {
  type TaskEntry,
  type TaskStatus,
  VALID_PRIORITIES,
  VALID_STATUSES,
  VALID_TRANSITIONS,
  doneIds,
  isBlocked,
  isReady,
  isValidTransition,
  nextStatus,
  readTasks,
  writeTasks,
} from "../lib/task-store.ts";
import {
  ansi,
  formatBlockedTree,
  formatRow,
  sectionHeader,
} from "./task-display.ts";

// ── Shared helpers ───────────────────────────────────────────────────────────

async function transitionTask(
  root: string,
  tasks: TaskEntry[],
  task: TaskEntry,
  newStatus: TaskStatus,
  opts: { outcomeNote?: string | null; branch?: string | null } = {},
): Promise<void> {
  const oldStatus = task.status;
  task.status = newStatus;
  task.date_status_changed = today();

  if (newStatus === "done") task.date_done = today();
  if (newStatus === "ready" && task.autonomous === undefined)
    task.autonomous = true;
  if (opts.outcomeNote !== undefined) task.outcome_note = opts.outcomeNote;
  if (opts.branch !== undefined) task.branch = opts.branch;

  await writeTasks(root, tasks);
  await updateMarkdownStatus(join(root, task.file), newStatus);
  console.log(`Task ${task.id}: ${oldStatus} → ${newStatus}`);

  if (newStatus === "done" && task.parent_id) {
    const siblings = tasks.filter((t) => t.parent_id === task.parent_id);
    const allDone = siblings.every(
      (t) => t.id === task.id || t.status === "done",
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

async function findTask(
  root: string,
  id: string,
): Promise<{ tasks: TaskEntry[]; task: TaskEntry }> {
  const tasks = await readTasks(root);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }
  return { tasks, task };
}

// ── Subcommands ──────────────────────────────────────────────────────────────

async function cmdAdd(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task add --title <title> [options]");
    console.log(
      "Options: --summary <text> --tags <tag1,tag2> --priority <high|normal|low>",
    );
    console.log("         --autonomous --parent <id> --depends-on <id1,id2>");
    console.log("         --idea <idea-id> --outcome <text> --note <text>");
    return;
  }

  const root = projectRoot();
  const title = parseFlag(args, "--title");
  if (!title) {
    console.error("Usage: domus task add --title <title> [options]");
    process.exit(1);
  }

  const summary = parseFlag(args, "--summary") ?? "";
  const tags =
    parseFlag(args, "--tags")
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? [];
  const priority = validateEnum(
    parseFlag(args, "--priority") ?? "normal",
    VALID_PRIORITIES,
    "priority",
  );
  const autonomous = hasFlag(args, "--autonomous");
  const parentId = parseFlag(args, "--parent") ?? null;
  const dependsOn =
    parseFlag(args, "--depends-on")
      ?.split(",")
      .map((d) => d.trim())
      .filter(Boolean) ?? [];
  const ideaId = parseFlag(args, "--idea") ?? null;
  const outcomeNote = parseFlag(args, "--outcome") || null;
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
    status: "raw",
    autonomous,
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
**Status:** raw
**Autonomous:** ${autonomous}
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

// ── advance ──────────────────────────────────────────────────────────────────

async function cmdAdvance(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task advance <id> [--note <text>]");
    return;
  }

  const root = projectRoot();
  const [id] = args;

  if (!id || id.startsWith("-")) {
    console.error("Usage: domus task advance <id> [--note <text>]");
    process.exit(1);
  }

  const { tasks, task } = await findTask(root, id);
  const next = nextStatus(task.status);

  if (!next) {
    console.error(
      `Cannot advance task ${id}: no next status from ${task.status}`,
    );
    process.exit(1);
  }

  const note = parseFlag(args, "--note");
  await transitionTask(root, tasks, task, next);

  if (note) {
    await logToExecutionLog(root, id, `Advanced to ${next}: ${note}`);
  }
}

// ── cancel ───────────────────────────────────────────────────────────────────

async function cmdCancel(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task cancel <id> [--note <text>]");
    return;
  }

  const root = projectRoot();
  const [id] = args;

  if (!id || id.startsWith("-")) {
    console.error("Usage: domus task cancel <id> [--note <text>]");
    process.exit(1);
  }

  const { tasks, task } = await findTask(root, id);

  if (!isValidTransition(task.status, "cancelled")) {
    console.error(
      `Cannot cancel task ${id}: invalid transition from ${task.status}`,
    );
    process.exit(1);
  }

  const note = parseFlag(args, "--note") || null;
  await transitionTask(root, tasks, task, "cancelled", { outcomeNote: note });
}

// ── defer ────────────────────────────────────────────────────────────────────

async function cmdDefer(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task defer <id> [--note <text>]");
    return;
  }

  const root = projectRoot();
  const [id] = args;

  if (!id || id.startsWith("-")) {
    console.error("Usage: domus task defer <id> [--note <text>]");
    process.exit(1);
  }

  const { tasks, task } = await findTask(root, id);

  if (!isValidTransition(task.status, "deferred")) {
    console.error(
      `Cannot defer task ${id}: invalid transition from ${task.status}`,
    );
    process.exit(1);
  }

  const note = parseFlag(args, "--note") || null;
  await transitionTask(root, tasks, task, "deferred", { outcomeNote: note });
}

// ── reopen ───────────────────────────────────────────────────────────────────

async function cmdReopen(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task reopen <id>");
    return;
  }

  const root = projectRoot();
  const [id] = args;

  if (!id || id.startsWith("-")) {
    console.error("Usage: domus task reopen <id>");
    process.exit(1);
  }

  const { tasks, task } = await findTask(root, id);

  if (!isValidTransition(task.status, "raw")) {
    console.error(
      `Cannot reopen task ${id}: invalid transition from ${task.status}`,
    );
    process.exit(1);
  }

  await transitionTask(root, tasks, task, "raw");
}

// ── status (power tool) ─────────────────────────────────────────────────────

async function cmdStatus(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log(
      `Usage: domus task status <id> <${VALID_STATUSES.join("|")}> [--outcome <text>]`,
    );
    return;
  }

  const root = projectRoot();
  const [id, newStatus] = args;

  if (!id || !newStatus) {
    console.error(
      `Usage: domus task status <id> <${VALID_STATUSES.join("|")}>`,
    );
    process.exit(1);
  }

  if (!VALID_STATUSES.includes(newStatus as TaskStatus)) {
    console.error(
      `Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(", ")}`,
    );
    process.exit(1);
  }

  const { tasks, task } = await findTask(root, id);

  if (!isValidTransition(task.status, newStatus as TaskStatus)) {
    const allowed = VALID_TRANSITIONS[task.status] ?? [];
    console.error(
      `Invalid transition: ${task.status} → ${newStatus}. Allowed: ${allowed.join(", ")}`,
    );
    process.exit(1);
  }

  const hasOutcomeFlag = hasFlag(args, "--outcome");
  const outcomeNote = parseFlag(args, "--outcome") || null;
  await transitionTask(root, tasks, task, newStatus as TaskStatus, {
    outcomeNote: hasOutcomeFlag ? outcomeNote : undefined,
  });
}

// ── ready ────────────────────────────────────────────────────────────────────

async function cmdReady(_args: string[]): Promise<void> {
  const root = projectRoot();
  const tasks = await readTasks(root);

  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  const done = doneIds(tasks);
  const inProgress = tasks.filter((t) => t.status === "in-progress");
  const ready = tasks.filter((t) => t.status === "ready" && isReady(t, done));
  const proposed = tasks.filter(
    (t) => t.status === "proposed" && isReady(t, done),
  );
  const raw = tasks.filter((t) => t.status === "raw" && isReady(t, done));
  const blocked = tasks.filter((t) => isBlocked(t, done));

  const fmt = (t: TaskEntry) =>
    `  [${t.priority}] ${t.id} — ${t.title}${t.summary ? `\n      ${t.summary}` : ""}`;

  if (inProgress.length > 0) {
    console.log("## In Progress\n");
    inProgress.forEach((t) => console.log(fmt(t)));
    console.log();
  }

  if (ready.length > 0) {
    console.log("## Ready\n");
    ready.forEach((t) => console.log(fmt(t)));
    console.log();
  }

  if (proposed.length > 0) {
    console.log("## Proposed (needs human review)\n");
    proposed.forEach((t) => console.log(fmt(t)));
    console.log();
  }

  if (raw.length > 0) {
    console.log("## Raw (needs refinement)\n");
    raw.forEach((t) => console.log(fmt(t)));
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
    ready.length === 0 &&
    proposed.length === 0 &&
    raw.length === 0 &&
    blocked.length === 0
  ) {
    console.log("No active tasks.");
  }
}

// ── list ─────────────────────────────────────────────────────────────────────

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
    raw: "○",
    proposed: "◐",
    ready: "◎",
    "in-progress": "◑",
    "ready-for-senior-review": "⊙",
    done: "●",
    cancelled: "✕",
    deferred: "⏸",
  };

  filtered.forEach((t) => {
    const icon = statusIcon[t.status] ?? "?";
    const autoFlag = t.autonomous ? " ⚙" : "";
    console.log(`${icon} [${t.priority}] ${t.id}${autoFlag}`);
  });
}

// ── show ─────────────────────────────────────────────────────────────────────

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
  console.log(`Autonomous:  ${task.autonomous}`);
  console.log(`Priority:    ${task.priority}`);
  console.log(`Captured:    ${task.date_captured}`);
  console.log(`Parent:      ${task.parent_id ?? "none"}`);
  console.log(
    `Depends on:  ${task.depends_on.length > 0 ? task.depends_on.join(", ") : "none"}`,
  );
  console.log(`Idea:        ${task.idea_id ?? "none"}`);
  console.log(
    `Tags:        ${task.tags.length > 0 ? task.tags.join(", ") : "none"}`,
  );
  console.log(`Summary:     ${task.summary || "(none)"}`);
  if (task.outcome_note) console.log(`Outcome:     ${task.outcome_note}`);
}

// ── update ───────────────────────────────────────────────────────────────────

async function cmdUpdate(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log(
      "Usage: domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>] [--priority <priority>] [--autonomous] [--no-autonomous] [--depends-on <id1,id2>] [--outcome <text>] [--note <text>] [--parent <id>] [--idea <id>]",
    );
    return;
  }

  const root = projectRoot();
  const [id] = args;

  if (!id) {
    console.error("Usage: domus task update <id> [options]");
    process.exit(1);
  }

  const { tasks, task } = await findTask(root, id);

  const newTitle = parseFlag(args, "--title");
  const newSummary = parseFlag(args, "--summary");
  const newTags = parseFlag(args, "--tags")
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const newPriority = parseFlag(args, "--priority");
  const setAutonomous = hasFlag(args, "--autonomous");
  const setNoAutonomous = hasFlag(args, "--no-autonomous");
  const newDependsOn = parseFlag(args, "--depends-on");
  const newOutcome = parseFlag(args, "--outcome");
  const newNote = parseFlag(args, "--note");
  const newParent = parseFlag(args, "--parent");
  const newIdea = parseFlag(args, "--idea");

  const hasUpdate =
    newTitle ||
    newSummary ||
    newTags ||
    newPriority ||
    setAutonomous ||
    setNoAutonomous ||
    newDependsOn !== undefined ||
    newOutcome !== undefined ||
    newNote ||
    newParent !== undefined ||
    newIdea !== undefined;

  if (!hasUpdate) {
    console.error("Nothing to update. Provide at least one flag.");
    process.exit(1);
  }

  if (newTitle) task.title = newTitle;
  if (newSummary) task.summary = newSummary;
  if (newTags) task.tags = newTags;
  if (newPriority)
    task.priority = validateEnum(newPriority, VALID_PRIORITIES, "priority");
  if (setAutonomous) task.autonomous = true;
  if (setNoAutonomous) task.autonomous = false;
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
    console.warn(
      `Warning: markdown file not found, JSONL updated but .md not synced: ${filePath}`,
    );
  } else {
    let content = await readFile(filePath, "utf-8");
    if (newTitle) content = updateMarkdownTitle(content, "Task", newTitle);
    if (newPriority)
      content = updateBoldField(content, "Priority", task.priority);
    if (setAutonomous || setNoAutonomous)
      content = updateBoldField(content, "Autonomous", String(task.autonomous));
    if (newDependsOn !== undefined) {
      const depsStr =
        task.depends_on.length > 0 ? task.depends_on.join(", ") : "none";
      content = updateBoldField(content, "Depends on", depsStr);
    }
    if (newParent !== undefined)
      content = updateBoldField(content, "Parent", task.parent_id ?? "none");
    if (newIdea !== undefined)
      content = updateBoldField(content, "Idea", task.idea_id ?? "none");
    if (newSummary)
      content = updateSection(content, "What This Task Is", newSummary);
    await writeFile(filePath, content, "utf-8");
  }

  console.log(`Task ${id} updated.`);
}

// ── Execution log ─────────────────────────────────────────────────────────────

async function logToExecutionLog(
  root: string,
  id: string,
  message: string,
): Promise<void> {
  const logsDir = join(root, DOMUS_DIR, "execution-logs");
  const logFile = join(logsDir, `${id}.md`);
  if (!existsSync(logFile)) return; // no execution log yet — that's fine
  const timestamp = new Date().toISOString();
  const logEntry = `## ${timestamp}\n\n${message}\n\n---\n`;
  await appendFile(logFile, logEntry, "utf-8");
}

async function cmdStart(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task start <id> --branch <branch>");
    return;
  }

  const root = projectRoot();
  const [id] = args;
  const branch = parseFlag(args, "--branch");

  if (!id) {
    console.error("Usage: domus task start <id> --branch <branch>");
    process.exit(1);
  }

  if (!branch) {
    console.error("Usage: domus task start <id> --branch <branch>");
    process.exit(1);
  }

  const { tasks, task } = await findTask(root, id);

  if (!isValidTransition(task.status, "in-progress")) {
    console.error(
      `Cannot start task ${id}: invalid transition ${task.status} → in-progress`,
    );
    process.exit(1);
  }

  await transitionTask(root, tasks, task, "in-progress", { branch });

  // Write branch to task markdown frontmatter
  const filePath = join(root, task.file);
  if (existsSync(filePath)) {
    let content = await readFile(filePath, "utf-8");
    if (content.includes("**Branch:**")) {
      content = content.replace(
        /^\*\*Branch:\*\* .+$/m,
        `**Branch:** ${branch}`,
      );
    } else {
      content = content.replace(
        /^(\*\*Status:\*\* .+)$/m,
        `$1\n**Branch:** ${branch}`,
      );
    }
    await writeFile(filePath, content, "utf-8");
  }

  // Create execution log
  const logsDir = join(root, DOMUS_DIR, "execution-logs");
  await mkdir(logsDir, { recursive: true });
  const logFile = join(logsDir, `${id}.md`);
  const timestamp = new Date().toISOString();
  const logContent = `# Execution Log: ${id}

## Started
**Branch:** ${branch}
**Date:** ${timestamp}

---
`;
  await writeFile(logFile, logContent, "utf-8");

  console.log(`  Branch:    ${branch}`);
  console.log(`  Log:       ${DOMUS_DIR}/execution-logs/${id}.md`);
}

async function cmdLog(args: string[]): Promise<void> {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log("Usage: domus task log <id> <message>");
    return;
  }

  const root = projectRoot();
  const [id, ...rest] = args;
  const message = rest.join(" ");

  if (!id || !message) {
    console.error("Usage: domus task log <id> <message>");
    process.exit(1);
  }

  const tasks = await readTasks(root);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString();
  const branch = task.branch ?? null;

  // Append to execution log
  const logsDir = join(root, DOMUS_DIR, "execution-logs");
  await mkdir(logsDir, { recursive: true });
  const logFile = join(logsDir, `${id}.md`);
  const logEntry = `## ${timestamp}

${message}

---
`;
  await appendFile(logFile, logEntry, "utf-8");

  // Append to audit log
  const auditFile = join(root, DOMUS_DIR, "audit.jsonl");
  const auditEntry = `${JSON.stringify({ id, message, timestamp, branch })}\n`;
  await appendFile(auditFile, auditEntry, "utf-8");

  console.log(`Logged to ${DOMUS_DIR}/execution-logs/${id}.md`);
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

  // Group by status, then separate blocked
  const readyTasks: TaskEntry[] = [];
  const inProgressTasks: TaskEntry[] = [];
  const proposedTasks: TaskEntry[] = [];
  const rawTasks: TaskEntry[] = [];
  const blockedTasks: TaskEntry[] = [];
  const doneTasks: TaskEntry[] = [];

  for (const t of tasks) {
    if (t.status === "cancelled" || t.status === "deferred") continue;
    if (t.status === "done") {
      if (includeDone) doneTasks.push(t);
      continue;
    }

    if (isBlocked(t, done)) {
      blockedTasks.push(t);
      continue;
    }

    switch (t.status) {
      case "ready":
        readyTasks.push(t);
        break;
      case "in-progress":
        inProgressTasks.push(t);
        break;
      case "proposed":
        proposedTasks.push(t);
        break;
      case "raw":
        rawTasks.push(t);
        break;
    }
  }

  const hasAny =
    readyTasks.length > 0 ||
    inProgressTasks.length > 0 ||
    proposedTasks.length > 0 ||
    rawTasks.length > 0 ||
    blockedTasks.length > 0 ||
    doneTasks.length > 0;

  if (interval) {
    console.log(ansi("2", `↻ ${interval}s`));
  }

  if (!hasAny) {
    console.log("No tasks to display.");
    return;
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Order: Ready → In Progress → Proposed → Raw → Blocked → Done
  const sections: [string, TaskEntry[]][] = [
    ["Ready", readyTasks],
    ["In Progress", inProgressTasks],
    ["Proposed", proposedTasks],
    ["Raw", rawTasks],
    ["Blocked", blockedTasks],
    ["Done", doneTasks],
  ];

  let firstSection = true;
  for (const [label, items] of sections) {
    if (items.length === 0) continue;
    if (!firstSection) console.log();
    firstSection = false;

    console.log(sectionHeader(label));
    if (label === "Blocked") {
      for (const t of items) {
        for (const line of formatBlockedTree(t, done, taskMap)) {
          console.log(line);
        }
      }
    } else {
      for (const t of items) {
        console.log(formatRow(t));
      }
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
  const passthroughArgs = args.filter(
    (a, i) => a !== "--interval" && args[i - 1] !== "--interval",
  );
  const domusBin = Bun.which("domus") ?? "domus";
  const result = Bun.spawnSync(
    [
      watchBin,
      "-c",
      "-t",
      "-n",
      interval,
      domusBin,
      "task",
      "overview",
      "--interval",
      interval,
      ...passthroughArgs,
    ],
    { stdio: ["inherit", "inherit", "inherit"] },
  );
  process.exit(result.exitCode ?? 0);
}

// ── Entry point ──────────────────────────────────────────────────────────────

const TASK_USAGE = `
domus task — task management

Usage:
  domus task add --title <title> [options]
  domus task advance <id> [--note <text>]
  domus task cancel <id> [--note <text>]
  domus task defer <id> [--note <text>]
  domus task reopen <id>
  domus task status <id> <status> [--outcome <text>]
  domus task update <id> [options]
  domus task show <id>
  domus task start <id> --branch <branch>
  domus task log <id> <message>
  domus task overview [--include-done]
  domus task ready
  domus task list [--status <status>] [--json]
  domus task watch [--interval <seconds>] [--include-done]

Subcommands:
  add       Create a new task (writes to .domus/tasks/)
  advance   Move task to its next status
  cancel    Cancel a task (from any active state)
  defer     Defer a task (from any active state)
  reopen    Reopen a cancelled or deferred task (→ raw)
  status    Set task status directly (Doctor power tool)
  update    Update metadata fields
  show      Print full detail for a single task
  start     Mark task in-progress, record branch, create execution log
  log       Append a timestamped entry to the execution log
  overview  Compact watch-friendly overview grouped by status
  ready     Show what's ready to work on (grouped by readiness)
  list      List all tasks (--json for machine-readable output)
  watch     Live-refresh overview via watch(1)
`.trim();

export async function runTask(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case "add":
      await cmdAdd(args.slice(1));
      break;
    case "advance":
      await cmdAdvance(args.slice(1));
      break;
    case "cancel":
      await cmdCancel(args.slice(1));
      break;
    case "defer":
      await cmdDefer(args.slice(1));
      break;
    case "reopen":
      await cmdReopen(args.slice(1));
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
    case "start":
      await cmdStart(args.slice(1));
      break;
    case "log":
      await cmdLog(args.slice(1));
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
