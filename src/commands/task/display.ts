import type {
  TaskEntry,
  TaskPriority,
  TaskStatus,
} from "../../lib/task-types.ts";

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
  raw: "○",
  proposed: "◐",
  ready: "◎",
  "in-progress": "◑",
  "ready-for-senior-review": "⊙",
  done: "✔",
  cancelled: "✕",
  deferred: "⏸",
  blocked: "⊘",
};

// ── Coloring ──────────────────────────────────────────────────────────────────

export function priorityAnsi(icon: string, priority: TaskPriority): string {
  switch (priority) {
    case "high":
      return ansi("33;1", icon); // yellow bold
    case "low":
      return ansi("2", icon); // dim
    default:
      return icon;
  }
}

export function statusAnsi(icon: string, status: TaskStatus): string {
  switch (status) {
    case "in-progress":
      return ansi("36", icon); // cyan
    case "ready":
    case "done":
      return ansi("32", icon); // green
    case "cancelled":
      return ansi("2", icon); // dim
    default:
      return icon;
  }
}

export function lineAnsi(line: string, status: TaskStatus): string {
  let code: string | null = null;
  if (status === "in-progress") {
    code = "36";
  } else if (status === "done") {
    code = "2";
  }

  if (!code) {
    return line;
  }

  const reapply = `\x1b[0m\x1b[${code}m`;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: matching ANSI escape sequences
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
  const sIcon = statusAnsi(STATUS_ICON[t.status] ?? "?", t.status);
  const autoFlag = t.autonomous ? "" : " ⚑";
  return lineAnsi(`${pIcon}  ${sIcon}  ${t.id}${autoFlag}`, t.status);
}

export function formatBlockedTree(
  t: TaskEntry,
  done: Set<string>,
  taskMap: Map<string, TaskEntry>,
): string[] {
  const pIcon = priorityAnsi(PRIORITY_ICON[t.priority] ?? "·", t.priority);
  const sIcon = statusAnsi(STATUS_ICON[t.status] ?? "?", t.status);
  const lines: string[] = [];
  lines.push(lineAnsi(`${t.id}  ${pIcon} ${sIcon}`, t.status));

  const unresolvedDeps = t.depends_on.filter((dep) => !done.has(dep));
  const termWidth = process.stdout.columns ?? 80;

  for (const depId of unresolvedDeps) {
    const dep = taskMap.get(depId);
    const prefix = dep
      ? `  · ${PRIORITY_ICON[dep.priority] ?? "·"} ${STATUS_ICON[dep.status] ?? "?"}  `
      : "  · ";
    const maxIdLen = termWidth - prefix.length;
    const displayId =
      depId.length > maxIdLen ? `${depId.slice(0, maxIdLen - 1)}…` : depId;
    lines.push(ansi("2", `${prefix}${displayId}`));
  }

  return lines;
}
