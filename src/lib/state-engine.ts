import type { TaskStatus } from "./task-types.ts";

// ── State engine ─────────────────────────────────────────────────────────────
// Single source of truth for all task status transitions.

const ESCAPE_HATCHES: TaskStatus[] = ["cancelled", "deferred"];

/** The standard forward progression path used by `domus task advance`. */
const ADVANCE_MAP: Partial<Record<TaskStatus, TaskStatus>> = {
  raw: "proposed",
  proposed: "ready",
  ready: "in-progress",
  "in-progress": "done", // skips ready-for-senior-review in v0.0
};

/**
 * Valid transitions per status. Kept tight: only the advance target + escape
 * hatches. The Doctor's `domus task status` command is the only way to bypass
 * this (it validates against ALL_TRANSITIONS instead).
 */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  raw: ["proposed", ...ESCAPE_HATCHES],
  proposed: ["ready", ...ESCAPE_HATCHES],
  ready: ["in-progress", ...ESCAPE_HATCHES],
  "in-progress": ["done", ...ESCAPE_HATCHES],
  "ready-for-senior-review": ["done", "in-progress", ...ESCAPE_HATCHES],
  done: ["raw"],
  cancelled: ["raw"],
  deferred: ["raw"],
};

/**
 * Looser transition rules used only by the Doctor power tool (`domus task status`).
 * Allows any forward progression, not just the immediate next step.
 */
const DOCTOR_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  raw: ["proposed", "ready", "in-progress", "done", ...ESCAPE_HATCHES],
  proposed: ["ready", "in-progress", "done", ...ESCAPE_HATCHES],
  ready: ["in-progress", "done", ...ESCAPE_HATCHES],
  "in-progress": ["ready-for-senior-review", "done", ...ESCAPE_HATCHES],
  "ready-for-senior-review": ["done", "in-progress", ...ESCAPE_HATCHES],
  done: ["raw"],
  cancelled: ["raw"],
  deferred: ["raw"],
};

export function nextStatus(current: TaskStatus): TaskStatus | null {
  return ADVANCE_MAP[current] ?? null;
}

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isDoctorTransition(from: TaskStatus, to: TaskStatus): boolean {
  return DOCTOR_TRANSITIONS[from]?.includes(to) ?? false;
}

export { VALID_TRANSITIONS, DOCTOR_TRANSITIONS };
