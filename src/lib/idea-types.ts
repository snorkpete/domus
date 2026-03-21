// ── Types ────────────────────────────────────────────────────────────────────

export type IdeaStatus =
  | "raw"
  | "refined"
  | "scoped"
  | "implemented"
  | "abandoned"
  | "deferred";

export type IdeaEntry = {
  id: string;
  title: string;
  file: string;
  date_captured: string | null;
  status: IdeaStatus;
  tags: string[];
  summary: string;
  date_status_changed: string | null;
  date_implemented: string | null;
  outcome_note: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const VALID_IDEA_STATUSES: IdeaStatus[] = [
  "raw",
  "refined",
  "scoped",
  "implemented",
  "abandoned",
  "deferred",
];
