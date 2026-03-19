// ── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "open" | "in-progress" | "ready-for-senior-review" | "done" | "cancelled" | "deferred";
export type TaskRefinement = "raw" | "proposed" | "refined" | "autonomous";
export type TaskPriority = "high" | "normal" | "low";

export type TaskEntry = {
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
  notes: string[];
  date_status_changed: string | null;
  date_done: string | null;
  outcome_note: string | null;
  branch?: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const VALID_STATUSES: TaskStatus[] = ["open", "in-progress", "ready-for-senior-review", "done", "cancelled", "deferred"];
export const VALID_REFINEMENTS: TaskRefinement[] = ["raw", "proposed", "refined", "autonomous"];
export const VALID_PRIORITIES: TaskPriority[] = ["high", "normal", "low"];
