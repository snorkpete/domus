import type { TaskEntry } from "./task-types.ts";

// ── Tag filter logic ──────────────────────────────────────────────────────────

export type TagFilterOptions = {
  /**
   * Whitelist: if non-empty, only tasks with at least one of these tags are shown.
   * When include matches, exclude rules are ignored.
   */
  includeTags: string[];
  /**
   * Blacklist: tasks with at least one of these tags are hidden.
   * Only applied when includeTags is empty.
   */
  excludeTags: string[];
  /**
   * Default hidden tags from config (defaultHiddenTags).
   * Merged with excludeTags when includeTags is empty.
   */
  defaultHiddenTags: string[];
};

/**
 * Returns true if the task should be shown given the tag filter options.
 *
 * Semantics:
 * - If includeTags is non-empty: show iff task has at least one include tag.
 *   Exclude rules (CLI + config) are ignored for include-matched tasks.
 * - If includeTags is empty: hide iff task has at least one tag in the
 *   effective exclude set (excludeTags ∪ defaultHiddenTags).
 */
export function taskPassesTagFilter(
  task: TaskEntry,
  opts: TagFilterOptions,
): boolean {
  const { includeTags, excludeTags, defaultHiddenTags } = opts;

  if (includeTags.length > 0) {
    // Whitelist mode: task must have at least one include tag
    return task.tags.some((tag) => includeTags.includes(tag));
  }

  // Blacklist mode: hide if task has any tag in the effective exclude set
  const effectiveExclude = [...new Set([...excludeTags, ...defaultHiddenTags])];
  if (effectiveExclude.length === 0) {
    return true;
  }
  return !task.tags.some((tag) => effectiveExclude.includes(tag));
}

/**
 * Parse a cumulative flag that may appear multiple times or as comma-separated
 * values. E.g. --tag a --tag b,c → ["a", "b", "c"].
 */
export function parseCumulativeTagFlag(args: string[], flag: string): string[] {
  const tags: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) {
      const value = args[i + 1];
      const parts = value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      tags.push(...parts);
      i++; // skip value
    }
  }
  return tags;
}
