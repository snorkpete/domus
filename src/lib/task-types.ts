// ── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus =
  | "raw"
  | "proposed"
  | "ready"
  | "in-progress"
  | "ready-for-human-review"
  | "ready-for-senior-review"
  | "done"
  | "cancelled"
  | "deferred"
  | "wont-fix";
export type TaskPriority = "high" | "normal" | "low";

export type TaskEntry = {
  id: string;
  title: string;
  file: string;
  date_captured: string;
  status: TaskStatus;
  autonomous: boolean;
  priority: TaskPriority;
  parent_id: string | null;
  depends_on: string[];
  idea_id: string | null;
  spec_refs: string[];
  tags: string[];
  summary: string;
  notes: string[];
  date_status_changed: string | null;
  date_done: string | null;
  outcome_note: string | null;
  branch?: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const VALID_STATUSES: TaskStatus[] = [
  "raw",
  "proposed",
  "ready",
  "in-progress",
  "ready-for-human-review",
  "ready-for-senior-review",
  "done",
  "cancelled",
  "deferred",
  "wont-fix",
];
export const VALID_PRIORITIES: TaskPriority[] = ["high", "normal", "low"];
