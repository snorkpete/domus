import { afterEach, beforeEach, expect, test } from "bun:test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runIdea } from "./idea.ts";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "domus-idea-test-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

function trapExit(): { didExit: () => boolean; restore: () => void } {
  let _exited = false;
  const orig = process.exit;
  process.exit = (() => {
    _exited = true;
    throw new Error("process.exit");
  }) as never;
  return { didExit: () => _exited, restore: () => { process.exit = orig; } };
}

function captureOutput(): { lines: () => string[]; restore: () => void } {
  const _lines: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args: unknown[]) => _lines.push(args.join(" "));
  console.error = (...args: unknown[]) => _lines.push(args.join(" "));
  return {
    lines: () => _lines,
    restore: () => { console.log = origLog; console.error = origErr; },
  };
}

async function readIdeasJsonl(): Promise<Record<string, unknown>[]> {
  const path = join(tempDir, ".domus", "ideas", "ideas.jsonl");
  const content = await readFile(path, "utf-8");
  return content.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}

async function readIdeaMd(id: string): Promise<string> {
  return readFile(join(tempDir, ".domus", "ideas", `${id}.md`), "utf-8");
}

// ── add ───────────────────────────────────────────────────────────────────────

test("add: creates JSONL entry with correct fields", async () => {
  await runIdea(["add", "--title", "My Idea", "--summary", "A summary", "--tags", "devex,product"]);

  const ideas = await readIdeasJsonl();
  expect(ideas).toHaveLength(1);
  const idea = ideas[0];
  expect(idea.title).toBe("My Idea");
  expect(idea.summary).toBe("A summary");
  expect(idea.tags).toEqual(["devex", "product"]);
  expect(idea.status).toBe("raw");
  expect(idea.id).toBe("my-idea");
});

test("add: creates .md detail file with status field", async () => {
  await runIdea(["add", "--title", "My Idea", "--summary", "A summary"]);

  const md = await readIdeaMd("my-idea");
  expect(md).toContain("# Idea: My Idea");
  expect(md).toContain("**Status:** raw");
  expect(md).toContain("A summary");
});

test("add: respects --status flag", async () => {
  await runIdea(["add", "--title", "Refined Idea", "--status", "refined"]);

  const ideas = await readIdeasJsonl();
  expect(ideas[0].status).toBe("refined");

  const md = await readIdeaMd("refined-idea");
  expect(md).toContain("**Status:** refined");
});

test("add: generates unique id on collision", async () => {
  await runIdea(["add", "--title", "Dupe"]);
  await runIdea(["add", "--title", "Dupe"]);

  const ideas = await readIdeasJsonl();
  expect(ideas).toHaveLength(2);
  expect(ideas[0].id).toBe("dupe");
  expect(ideas[1].id).toBe("dupe-2");
});

test("add: exits without --title", async () => {
  const trap = trapExit();
  try {
    await runIdea(["add"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("add: exits on invalid --status value", async () => {
  const trap = trapExit();
  try {
    await runIdea(["add", "--title", "My Idea", "--status", "bogus"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── status ────────────────────────────────────────────────────────────────────

test("status: updates status in JSONL and .md file", async () => {
  await runIdea(["add", "--title", "My Idea"]);
  await runIdea(["status", "my-idea", "refined"]);

  const ideas = await readIdeasJsonl();
  expect(ideas[0].status).toBe("refined");

  const md = await readIdeaMd("my-idea");
  expect(md).toContain("**Status:** refined");
});

test("status: sets date_implemented when marking implemented", async () => {
  await runIdea(["add", "--title", "My Idea"]);
  await runIdea(["status", "my-idea", "implemented"]);

  const ideas = await readIdeasJsonl();
  expect(ideas[0].date_implemented).not.toBeNull();
});

test("status: sets date_status_changed", async () => {
  await runIdea(["add", "--title", "My Idea"]);
  await runIdea(["status", "my-idea", "refined"]);

  const ideas = await readIdeasJsonl();
  expect(ideas[0].date_status_changed).not.toBeNull();
});

test("status: requires --note for abandoned", async () => {
  await runIdea(["add", "--title", "My Idea"]);
  const trap = trapExit();
  try {
    await runIdea(["status", "my-idea", "abandoned"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("status: requires --note for deferred", async () => {
  await runIdea(["add", "--title", "My Idea"]);
  const trap = trapExit();
  try {
    await runIdea(["status", "my-idea", "deferred"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("status: saves outcome note", async () => {
  await runIdea(["add", "--title", "My Idea"]);
  await runIdea(["status", "my-idea", "abandoned", "--note", "Not viable"]);

  const ideas = await readIdeasJsonl();
  expect(ideas[0].outcome_note).toBe("Not viable");
});

test("status: exits on unknown id", async () => {
  const trap = trapExit();
  try {
    await runIdea(["status", "no-such-idea", "refined"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("status: exits on invalid status value", async () => {
  await runIdea(["add", "--title", "My Idea"]);
  const trap = trapExit();
  try {
    await runIdea(["status", "my-idea", "invalid"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── list ──────────────────────────────────────────────────────────────────────

test("list: outputs icon + id + title", async () => {
  await runIdea(["add", "--title", "My Idea"]);

  const out = captureOutput();
  try {
    await runIdea(["list"]);
  } finally {
    out.restore();
  }
  expect(out.lines().join("\n")).toContain("my-idea");
  expect(out.lines().join("\n")).toContain("My Idea");
});

test("list --json: outputs full JSON array", async () => {
  await runIdea(["add", "--title", "Idea A"]);
  await runIdea(["add", "--title", "Idea B"]);

  const out = captureOutput();
  try {
    await runIdea(["list", "--json"]);
  } finally {
    out.restore();
  }
  const parsed = JSON.parse(out.lines().join(""));
  expect(parsed).toHaveLength(2);
  expect(parsed[0].title).toBe("Idea A");
  expect(parsed[1].title).toBe("Idea B");
});

test("list --status: filters by status", async () => {
  await runIdea(["add", "--title", "Idea A"]);
  await runIdea(["add", "--title", "Idea B"]);
  await runIdea(["status", "idea-a", "refined"]);

  const out = captureOutput();
  try {
    await runIdea(["list", "--status", "raw"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("idea-b");
  expect(output).not.toContain("idea-a");
});

// ── show ──────────────────────────────────────────────────────────────────────

test("show: prints detail for a known idea", async () => {
  await runIdea(["add", "--title", "My Idea", "--summary", "A summary", "--tags", "devex"]);

  const out = captureOutput();
  try {
    await runIdea(["show", "my-idea"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("My Idea");
  expect(output).toContain("A summary");
  expect(output).toContain("devex");
});

test("show: exits on unknown id", async () => {
  const trap = trapExit();
  try {
    await runIdea(["show", "no-such-idea"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── update ────────────────────────────────────────────────────────────────────

test("update: updates title in JSONL and .md heading", async () => {
  await runIdea(["add", "--title", "Old Title"]);
  await runIdea(["update", "old-title", "--title", "New Title"]);

  const ideas = await readIdeasJsonl();
  expect(ideas[0].title).toBe("New Title");

  const md = await readIdeaMd("old-title");
  expect(md).toContain("# Idea: New Title");
});

test("update: updates summary in JSONL", async () => {
  await runIdea(["add", "--title", "My Idea", "--summary", "Old"]);
  await runIdea(["update", "my-idea", "--summary", "New summary"]);

  const ideas = await readIdeasJsonl();
  expect(ideas[0].summary).toBe("New summary");
});

test("update: updates tags in JSONL", async () => {
  await runIdea(["add", "--title", "My Idea", "--tags", "devex"]);
  await runIdea(["update", "my-idea", "--tags", "product,backend"]);

  const ideas = await readIdeasJsonl();
  expect(ideas[0].tags).toEqual(["product", "backend"]);
});

test("update: exits on unknown id", async () => {
  const trap = trapExit();
  try {
    await runIdea(["update", "no-such-idea", "--title", "X"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("update: exits with no flags", async () => {
  await runIdea(["add", "--title", "My Idea"]);
  const trap = trapExit();
  try {
    await runIdea(["update", "my-idea"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});
