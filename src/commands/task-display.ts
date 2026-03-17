import type { TaskEntry, TaskPriority, TaskRefinement, TaskStatus } from "../lib/task-types.ts";

// ── ANSI helpers ──────────────────────────────────────────────────────────────

export function ansi(code: string, text: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

// ── Icon maps ─────────────────────────────────────────────────────────────────

export const PRIORITY_ICON: Record<TaskPriority, string> = {
  high: "▲",
  normal: "·",
  low: "▼",
};

export const STATUS_ICON: Record<TaskStatus | "blocked", string> = {
  open: "○",
  "in-progress": "◑",
  done: "●",
  cancelled: "✕",
  deferred: "⏸",
  blocked: "⊘",
};

export const REFINEMENT_ICON: Record<Exclude<TaskRefinement, "autonomous">, string> = {
  raw: "~",
  proposed: "◐",
  refined: "◎",
};

// ── Coloring ──────────────────────────────────────────────────────────────────

export function priorityAnsi(icon: string, priority: TaskPriority): string {
  if (priority === "high") return ansi("33;1", icon); // yellow bold
  if (priority === "low") return ansi("2", icon);     // dim
  return icon;
}

export function statusAnsi(icon: string, status: TaskStatus): string {
  if (status === "in-progress") return ansi("36", icon); // cyan
  if (status === "done") return ansi("32", icon);        // green
  if (status === "cancelled") return ansi("2", icon);    // dim
  return icon;
}

export function lineAnsi(line: string, status: TaskStatus): string {
  const code = status === "in-progress" ? "36" : status === "done" ? "2" : null;
  if (!code) return line;
  const reapply = `\x1b[0m\x1b[${code}m`;
  return `\x1b[${code}m${line.replace(/\x1b\[0m/g, reapply)}\x1b[0m`;
}

// ── Section header ────────────────────────────────────────────────────────────

export function sectionHeader(label: string): string {
  const line = "─".repeat(Math.max(0, 48 - label.length - 4));
  return ansi("2", `── ${label} ${line}`);
}

// ── Row formatters ────────────────────────────────────────────────────────────

export function formatRow(t: TaskEntry): string {
  const pIcon = priorityAnsi(PRIORITY_ICON[t.priority] ?? "·", t.priority);
  const rIcon = t.refinement !== "autonomous" ? ` ${REFINEMENT_ICON[t.refinement] ?? "?"}` : " ";
  const sIcon = statusAnsi(STATUS_ICON[t.status] ?? "?", t.status);
  return lineAnsi(`${pIcon}${rIcon} ${sIcon}  ${t.id}`, t.status);
}

export function formatAutonomousRow(t: TaskEntry): string {
  const pIcon = priorityAnsi(PRIORITY_ICON[t.priority] ?? "·", t.priority);
  const sIcon = statusAnsi(STATUS_ICON[t.status] ?? "?", t.status);
  return lineAnsi(`${pIcon}   ${sIcon}  ${t.id}`, t.status);
}

export function formatBlockedTree(t: TaskEntry, done: Set<string>, taskMap: Map<string, TaskEntry>): string[] {
  const pIcon = priorityAnsi(PRIORITY_ICON[t.priority] ?? "·", t.priority);
  const rIcon = t.refinement !== "autonomous" ? ` ${REFINEMENT_ICON[t.refinement] ?? "?"}` : "";
  const sIcon = statusAnsi(STATUS_ICON[t.status] ?? "?", t.status);
  const lines: string[] = [];
  lines.push(lineAnsi(`${t.id}  ${pIcon}${rIcon} ${sIcon}`, t.status));
  const unresolvedDeps = t.depends_on.filter((dep) => !done.has(dep));
  const termWidth = process.stdout.columns ?? 80;
  for (const depId of unresolvedDeps) {
    const dep = taskMap.get(depId);
    if (dep) {
      const depPIcon = PRIORITY_ICON[dep.priority] ?? "·";
      const depRIcon = dep.refinement !== "autonomous" ? ` ${REFINEMENT_ICON[dep.refinement as Exclude<TaskRefinement, "autonomous">] ?? "?"}` : "";
      const depSIcon = STATUS_ICON[dep.status] ?? "?";
      const prefix = `  · ${depPIcon}${depRIcon} ${depSIcon}  `;
      const maxIdLen = termWidth - prefix.length;
      const displayId = dep.id.length > maxIdLen ? `${dep.id.slice(0, maxIdLen - 1)}…` : dep.id;
      lines.push(ansi("2", `${prefix}${displayId}`));
    } else {
      const prefix = "  · ";
      const maxIdLen = termWidth - prefix.length;
      const displayId = depId.length > maxIdLen ? `${depId.slice(0, maxIdLen - 1)}…` : depId;
      lines.push(ansi("2", `${prefix}${displayId}`));
    }
  }
  return lines;
}
