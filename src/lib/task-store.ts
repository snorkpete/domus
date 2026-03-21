import { join } from "node:path";
import { DOMUS_DIR, projectRoot, readJsonl, writeJsonl } from "./jsonl.ts";
import {
  type TaskEntry,
  type TaskPriority,
  type TaskStatus,
  VALID_PRIORITIES,
  VALID_STATUSES,
} from "./task-types.ts";

export type { TaskEntry, TaskStatus, TaskPriority };
export { VALID_STATUSES, VALID_PRIORITIES };

// ── Path helpers ──────────────────────────────────────────────────────────────

export function tasksJsonlPath(root: string): string {
  return join(root, DOMUS_DIR, "tasks", "tasks.jsonl");
}

export function tasksDir(root: string): string {
  return join(root, DOMUS_DIR, "tasks");
}

// ── Store helpers ─────────────────────────────────────────────────────────────

export async function readTasks(root: string): Promise<TaskEntry[]> {
  const tasks = await readJsonl<TaskEntry>(tasksJsonlPath(root));
  // Normalize records written before the notes field was added
  // @ts-ignore - this is to default notes for pre-existing tasks (can eventually be removed)
  return tasks.map((t) => ({ notes: [], ...t }));
}

export async function writeTasks(
  root: string,
  tasks: TaskEntry[],
): Promise<void> {
  return writeJsonl(tasksJsonlPath(root), tasksDir(root), tasks);
}

// ── State engine ─────────────────────────────────────────────────────────────
// Single source of truth for all task status transitions.

const ESCAPE_HATCHES: TaskStatus[] = ["cancelled", "deferred"];

const ADVANCE_MAP: Partial<Record<TaskStatus, TaskStatus>> = {
  raw: "proposed",
  proposed: "ready",
  ready: "in-progress",
  "in-progress": "done", // skips ready-for-senior-review in v0.0
};

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  raw: ["proposed", "ready", "in-progress", "done", ...ESCAPE_HATCHES],
  proposed: ["ready", "in-progress", "done", ...ESCAPE_HATCHES],
  ready: ["in-progress", "done", ...ESCAPE_HATCHES],
  "in-progress": ["ready-for-senior-review", "done", ...ESCAPE_HATCHES],
  "ready-for-senior-review": ["done", "in-progress", ...ESCAPE_HATCHES],
  done: [...ESCAPE_HATCHES],
  cancelled: ["raw"],
  deferred: ["raw"],
};

export function nextStatus(current: TaskStatus): TaskStatus | null {
  return ADVANCE_MAP[current] ?? null;
}

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export { VALID_TRANSITIONS };

// ── Computed queries ──────────────────────────────────────────────────────────

export function doneIds(tasks: TaskEntry[]): Set<string> {
  return new Set(tasks.filter((t) => t.status === "done").map((t) => t.id));
}

/** Active statuses that participate in ready/blocked checks */
const ACTIVE_STATUSES = new Set<TaskStatus>([
  "raw",
  "proposed",
  "ready",
  "in-progress",
]);

export function isReady(task: TaskEntry, done: Set<string>): boolean {
  if (!ACTIVE_STATUSES.has(task.status)) return false;
  return task.depends_on.every((dep) => done.has(dep));
}

export function isBlocked(task: TaskEntry, done: Set<string>): boolean {
  if (!ACTIVE_STATUSES.has(task.status)) return false;
  return task.depends_on.some((dep) => !done.has(dep));
}
