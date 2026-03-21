import { existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hasFlag, parseFlag, validateEnum } from "../../lib/args.ts";
import { DOMUS_DIR, today, updateMarkdownStatus } from "../../lib/jsonl.ts";
import {
  updateBoldField,
  updateMarkdownTitle,
  updateSection,
} from "../../lib/markdown.ts";
import {
  VALID_PRIORITIES,
  readTasks,
  writeTasks,
} from "../../lib/task-store.ts";
import type {
  TaskEntry,
  TaskPriority,
  TaskStatus,
} from "../../lib/task-types.ts";

// ── Task lookup ──────────────────────────────────────────────────────────────

export async function findTask(
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

// ── Execution log ────────────────────────────────────────────────────────────

export async function logToExecutionLog(
  root: string,
  id: string,
  message: string,
): Promise<void> {
  const logsDir = join(root, DOMUS_DIR, "execution-logs");
  const logFile = join(logsDir, `${id}.md`);
  if (!existsSync(logFile)) {
    return;
  }
  const timestamp = new Date().toISOString();
  const logEntry = `## ${timestamp}\n\n${message}\n\n---\n`;
  await appendFile(logFile, logEntry, "utf-8");
}

// ── Status transitions ───────────────────────────────────────────────────────

export async function transitionTask(
  root: string,
  tasks: TaskEntry[],
  task: TaskEntry,
  newStatus: TaskStatus,
  opts: { outcomeNote?: string | null; branch?: string | null } = {},
): Promise<void> {
  const oldStatus = task.status;
  task.status = newStatus;
  task.date_status_changed = today();

  if (newStatus === "done") {
    task.date_done = today();
  }
  if (opts.outcomeNote !== undefined) {
    task.outcome_note = opts.outcomeNote;
  }
  if (opts.branch !== undefined) {
    task.branch = opts.branch;
  }

  await writeTasks(root, tasks);
  await updateMarkdownStatus(join(root, task.file), newStatus);
  console.log(`Task ${task.id}: ${oldStatus} → ${newStatus}`);

  // Auto-log transition to execution log
  await logToExecutionLog(root, task.id, `${oldStatus} → ${newStatus}`);

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

// ── Metadata sync ────────────────────────────────────────────────────────────
// Central utility for updating task metadata fields across both JSONL and
// the markdown file. Callers describe which fields changed; this function
// handles the dual-write.

export type MetadataUpdate = {
  title?: string;
  summary?: string;
  tags?: string[];
  priority?: TaskPriority;
  autonomous?: boolean;
  dependsOn?: string[];
  outcomeNote?: string | null;
  note?: string;
  parentId?: string | null;
  ideaId?: string | null;
};

export async function applyMetadataUpdate(
  root: string,
  tasks: TaskEntry[],
  task: TaskEntry,
  update: MetadataUpdate,
): Promise<void> {
  // Apply to JSONL entry
  if (update.title !== undefined) {
    task.title = update.title;
  }
  if (update.summary !== undefined) {
    task.summary = update.summary;
  }
  if (update.tags !== undefined) {
    task.tags = update.tags;
  }
  if (update.priority !== undefined) {
    task.priority = update.priority;
  }
  if (update.autonomous !== undefined) {
    task.autonomous = update.autonomous;
  }
  if (update.dependsOn !== undefined) {
    task.depends_on = update.dependsOn;
  }
  if (update.outcomeNote !== undefined) {
    task.outcome_note = update.outcomeNote;
  }
  if (update.note !== undefined) {
    task.notes = [...task.notes, update.note];
  }
  if (update.parentId !== undefined) {
    task.parent_id = update.parentId;
  }
  if (update.ideaId !== undefined) {
    task.idea_id = update.ideaId;
  }

  await writeTasks(root, tasks);

  // Sync markdown file
  const filePath = join(root, task.file);
  if (!existsSync(filePath)) {
    console.warn(
      `Warning: markdown file not found, JSONL updated but .md not synced: ${filePath}`,
    );
    return;
  }

  let content = await readFile(filePath, "utf-8");

  if (update.title !== undefined) {
    content = updateMarkdownTitle(content, "Task", update.title);
  }
  if (update.priority !== undefined) {
    content = updateBoldField(content, "Priority", task.priority);
  }
  if (update.autonomous !== undefined) {
    content = updateBoldField(content, "Autonomous", String(task.autonomous));
  }
  if (update.dependsOn !== undefined) {
    const depsStr =
      task.depends_on.length > 0 ? task.depends_on.join(", ") : "none";
    content = updateBoldField(content, "Depends on", depsStr);
  }
  if (update.parentId !== undefined) {
    content = updateBoldField(content, "Parent", task.parent_id ?? "none");
  }
  if (update.ideaId !== undefined) {
    content = updateBoldField(content, "Idea", task.idea_id ?? "none");
  }
  if (update.summary !== undefined) {
    content = updateSection(content, "What This Task Is", update.summary);
  }

  await writeFile(filePath, content, "utf-8");
}

// ── CLI arg extraction ───────────────────────────────────────────────────────
// Standardized way to extract common flags from CLI args.

export function extractId(args: string[], usage: string): string {
  const [id] = args;
  if (!id || id.startsWith("-")) {
    console.error(usage);
    process.exit(1);
  }
  return id;
}

export function extractMetadataFlags(args: string[]): MetadataUpdate | null {
  const title = parseFlag(args, "--title") ?? undefined;
  const summary = parseFlag(args, "--summary") ?? undefined;
  const tagsRaw = parseFlag(args, "--tags");
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;
  const priorityRaw = parseFlag(args, "--priority");
  const priority = priorityRaw
    ? validateEnum(priorityRaw, VALID_PRIORITIES, "priority")
    : undefined;
  const setAutonomous = hasFlag(args, "--autonomous");
  const setNoAutonomous = hasFlag(args, "--no-autonomous");
  const autonomous = setAutonomous ? true : setNoAutonomous ? false : undefined;
  const dependsOnRaw = parseFlag(args, "--depends-on");
  const dependsOn =
    dependsOnRaw !== undefined
      ? dependsOnRaw
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
      : undefined;
  const outcomeRaw = parseFlag(args, "--outcome");
  const outcomeNote = outcomeRaw !== undefined ? outcomeRaw || null : undefined;
  const note = parseFlag(args, "--note") ?? undefined;
  const parentRaw = parseFlag(args, "--parent");
  const parentId = parentRaw !== undefined ? parentRaw || null : undefined;
  const ideaRaw = parseFlag(args, "--idea");
  const ideaId = ideaRaw !== undefined ? ideaRaw || null : undefined;

  const hasUpdate =
    title !== undefined ||
    summary !== undefined ||
    tags !== undefined ||
    priority !== undefined ||
    autonomous !== undefined ||
    dependsOn !== undefined ||
    outcomeNote !== undefined ||
    note !== undefined ||
    parentId !== undefined ||
    ideaId !== undefined;

  if (!hasUpdate) {
    return null;
  }

  return {
    title,
    summary,
    tags,
    priority,
    autonomous,
    dependsOn,
    outcomeNote,
    note,
    parentId,
    ideaId,
  };
}

export function showHelp(args: string[]): boolean {
  return hasFlag(args, "--help") || hasFlag(args, "-h");
}
