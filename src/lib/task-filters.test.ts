import { expect, test } from "bun:test";
import { parseCumulativeTagFlag, taskPassesTagFilter } from "./task-filters.ts";
import type { TaskEntry } from "./task-types.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(tags: string[]): TaskEntry {
  return {
    id: "test-task",
    title: "Test Task",
    file: ".domus/tasks/test-task.md",
    date_captured: "2026-01-01",
    status: "raw",
    autonomous: false,
    priority: "normal",
    parent_id: null,
    depends_on: [],
    idea_id: null,
    spec_refs: [],
    tags,
    summary: "",
    notes: [],
    date_status_changed: null,
    date_done: null,
    outcome_note: null,
  };
}

// ── taskPassesTagFilter ───────────────────────────────────────────────────────

test("no filters: task with no tags is shown", () => {
  const task = makeTask([]);
  expect(
    taskPassesTagFilter(task, {
      includeTags: [],
      excludeTags: [],
      defaultHiddenTags: [],
    }),
  ).toBe(true);
});

test("no filters: task with tags is shown", () => {
  const task = makeTask(["feature"]);
  expect(
    taskPassesTagFilter(task, {
      includeTags: [],
      excludeTags: [],
      defaultHiddenTags: [],
    }),
  ).toBe(true);
});

test("default hiding: health-check tag hidden by defaultHiddenTags", () => {
  const task = makeTask(["health-check"]);
  expect(
    taskPassesTagFilter(task, {
      includeTags: [],
      excludeTags: [],
      defaultHiddenTags: ["health-check"],
    }),
  ).toBe(false);
});

test("default hiding: task without health-check tag is shown", () => {
  const task = makeTask(["feature"]);
  expect(
    taskPassesTagFilter(task, {
      includeTags: [],
      excludeTags: [],
      defaultHiddenTags: ["health-check"],
    }),
  ).toBe(true);
});

test("default hiding: task with no tags is shown even when defaultHiddenTags set", () => {
  const task = makeTask([]);
  expect(
    taskPassesTagFilter(task, {
      includeTags: [],
      excludeTags: [],
      defaultHiddenTags: ["health-check"],
    }),
  ).toBe(true);
});

test("--tag whitelist: task with matching tag is shown", () => {
  const task = makeTask(["health-check"]);
  expect(
    taskPassesTagFilter(task, {
      includeTags: ["health-check"],
      excludeTags: [],
      defaultHiddenTags: ["health-check"],
    }),
  ).toBe(true);
});

test("--tag whitelist: --tag overrides config defaultHiddenTags", () => {
  const task = makeTask(["health-check"]);
  // Even though defaultHiddenTags would exclude it, --tag overrides
  expect(
    taskPassesTagFilter(task, {
      includeTags: ["health-check"],
      excludeTags: [],
      defaultHiddenTags: ["health-check"],
    }),
  ).toBe(true);
});

test("--tag whitelist: task without matching tag is hidden", () => {
  const task = makeTask(["feature"]);
  expect(
    taskPassesTagFilter(task, {
      includeTags: ["health-check"],
      excludeTags: [],
      defaultHiddenTags: [],
    }),
  ).toBe(false);
});

test("--tag whitelist: task with no tags is hidden when --tag is non-empty", () => {
  const task = makeTask([]);
  expect(
    taskPassesTagFilter(task, {
      includeTags: ["health-check"],
      excludeTags: [],
      defaultHiddenTags: [],
    }),
  ).toBe(false);
});

test("include beats exclude: --tag overrides --exclude-tag for same tag", () => {
  const task = makeTask(["health-check"]);
  // --tag a --exclude-tag a → include wins
  expect(
    taskPassesTagFilter(task, {
      includeTags: ["health-check"],
      excludeTags: ["health-check"],
      defaultHiddenTags: [],
    }),
  ).toBe(true);
});

test("include beats exclude: --tag a overrides --exclude-tag b for task with both", () => {
  const task = makeTask(["alpha", "beta"]);
  expect(
    taskPassesTagFilter(task, {
      includeTags: ["alpha"],
      excludeTags: ["beta"],
      defaultHiddenTags: [],
    }),
  ).toBe(true);
});

test("--exclude-tag blacklist: hides task with matching tag", () => {
  const task = makeTask(["internal"]);
  expect(
    taskPassesTagFilter(task, {
      includeTags: [],
      excludeTags: ["internal"],
      defaultHiddenTags: [],
    }),
  ).toBe(false);
});

test("cumulative excludeTags: both tags are checked", () => {
  const taskA = makeTask(["alpha"]);
  const taskB = makeTask(["beta"]);
  const taskC = makeTask(["gamma"]);
  const opts = {
    includeTags: [],
    excludeTags: ["alpha", "beta"],
    defaultHiddenTags: [],
  };
  expect(taskPassesTagFilter(taskA, opts)).toBe(false);
  expect(taskPassesTagFilter(taskB, opts)).toBe(false);
  expect(taskPassesTagFilter(taskC, opts)).toBe(true);
});

test("cumulative includeTags: task matching any include tag is shown", () => {
  const taskA = makeTask(["alpha"]);
  const taskB = makeTask(["beta"]);
  const taskC = makeTask(["gamma"]);
  const opts = {
    includeTags: ["alpha", "beta"],
    excludeTags: [],
    defaultHiddenTags: [],
  };
  expect(taskPassesTagFilter(taskA, opts)).toBe(true);
  expect(taskPassesTagFilter(taskB, opts)).toBe(true);
  expect(taskPassesTagFilter(taskC, opts)).toBe(false);
});

test("effective exclude set is union of excludeTags and defaultHiddenTags", () => {
  const taskA = makeTask(["health-check"]);
  const taskB = makeTask(["internal"]);
  const taskC = makeTask(["feature"]);
  const opts = {
    includeTags: [],
    excludeTags: ["internal"],
    defaultHiddenTags: ["health-check"],
  };
  expect(taskPassesTagFilter(taskA, opts)).toBe(false);
  expect(taskPassesTagFilter(taskB, opts)).toBe(false);
  expect(taskPassesTagFilter(taskC, opts)).toBe(true);
});

// ── parseCumulativeTagFlag ────────────────────────────────────────────────────

test("parseCumulativeTagFlag: returns empty array when flag absent", () => {
  expect(parseCumulativeTagFlag(["--status", "raw"], "--tag")).toEqual([]);
});

test("parseCumulativeTagFlag: single value", () => {
  expect(parseCumulativeTagFlag(["--tag", "health-check"], "--tag")).toEqual([
    "health-check",
  ]);
});

test("parseCumulativeTagFlag: comma-separated values in single flag", () => {
  expect(
    parseCumulativeTagFlag(["--tag", "alpha,beta,gamma"], "--tag"),
  ).toEqual(["alpha", "beta", "gamma"]);
});

test("parseCumulativeTagFlag: multiple --tag flags accumulate", () => {
  expect(
    parseCumulativeTagFlag(
      ["--tag", "alpha", "--tag", "beta", "--tag", "gamma"],
      "--tag",
    ),
  ).toEqual(["alpha", "beta", "gamma"]);
});

test("parseCumulativeTagFlag: mixed repeated and comma-separated", () => {
  expect(
    parseCumulativeTagFlag(["--tag", "alpha,beta", "--tag", "gamma"], "--tag"),
  ).toEqual(["alpha", "beta", "gamma"]);
});

test("parseCumulativeTagFlag: trims whitespace from values", () => {
  expect(parseCumulativeTagFlag(["--tag", " alpha , beta "], "--tag")).toEqual([
    "alpha",
    "beta",
  ]);
});

test("parseCumulativeTagFlag: ignores empty segments from trailing comma", () => {
  expect(parseCumulativeTagFlag(["--tag", "alpha,"], "--tag")).toEqual([
    "alpha",
  ]);
});
