import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateIdeaSchema, migrateTaskSchema } from "./update-steps.ts";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "domus-update-steps-test-"));
  // Set up the .domus/tasks directory
  await mkdir(join(tempDir, ".domus/tasks"), { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function tasksJsonlPath(): string {
  return join(tempDir, ".domus/tasks/tasks.jsonl");
}

async function writeTasksJsonl(records: object[]): Promise<void> {
  const lines = records.map((r) => JSON.stringify(r)).join("\n");
  await writeFile(
    tasksJsonlPath(),
    lines.length > 0 ? `${lines}\n` : "",
    "utf-8",
  );
}

async function readTasksJsonl(): Promise<object[]> {
  if (!existsSync(tasksJsonlPath())) return [];
  const content = await readFile(tasksJsonlPath(), "utf-8");
  return content
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

async function writeTaskMd(name: string, content: string): Promise<void> {
  await writeFile(join(tempDir, ".domus/tasks", name), content, "utf-8");
}

async function readTaskMd(name: string): Promise<string> {
  return readFile(join(tempDir, ".domus/tasks", name), "utf-8");
}

// ── migrateTaskSchema: JSONL migration ────────────────────────────────────────

test("migrates open+raw to status:raw autonomous:false", async () => {
  await writeTasksJsonl([
    { id: "t1", status: "open", refinement: "raw", title: "Task 1" },
  ]);

  await migrateTaskSchema(tempDir);

  const records = await readTasksJsonl();
  expect(records).toHaveLength(1);
  const r = records[0] as Record<string, unknown>;
  expect(r.status).toBe("raw");
  expect(r.autonomous).toBe(false);
  expect(r.refinement).toBeUndefined();
});

test("migrates open+autonomous to status:ready autonomous:true", async () => {
  await writeTasksJsonl([
    { id: "t1", status: "open", refinement: "autonomous", title: "Task 1" },
  ]);

  await migrateTaskSchema(tempDir);

  const records = await readTasksJsonl();
  const r = records[0] as Record<string, unknown>;
  expect(r.status).toBe("ready");
  expect(r.autonomous).toBe(true);
  expect(r.refinement).toBeUndefined();
});

test("migrates done to status:done autonomous:true", async () => {
  await writeTasksJsonl([
    { id: "t1", status: "done", refinement: "raw", title: "Task 1" },
  ]);

  await migrateTaskSchema(tempDir);

  const records = await readTasksJsonl();
  const r = records[0] as Record<string, unknown>;
  expect(r.status).toBe("done");
  expect(r.autonomous).toBe(true);
  expect(r.refinement).toBeUndefined();
});

test("migrates deferred to status:deferred autonomous:false", async () => {
  await writeTasksJsonl([
    { id: "t1", status: "deferred", refinement: "raw", title: "Task 1" },
  ]);

  await migrateTaskSchema(tempDir);

  const records = await readTasksJsonl();
  const r = records[0] as Record<string, unknown>;
  expect(r.status).toBe("deferred");
  expect(r.autonomous).toBe(false);
  expect(r.refinement).toBeUndefined();
});

test("leaves already-migrated records untouched (idempotent)", async () => {
  await writeTasksJsonl([
    { id: "t1", status: "raw", autonomous: false, title: "Task 1" },
    { id: "t2", status: "ready", autonomous: true, title: "Task 2" },
  ]);

  const result = await migrateTaskSchema(tempDir);

  expect(result.jsonlMigrated).toBe(0);
  const records = await readTasksJsonl();
  const r0 = records[0] as Record<string, unknown>;
  const r1 = records[1] as Record<string, unknown>;
  expect(r0.status).toBe("raw");
  expect(r0.autonomous).toBe(false);
  expect(r1.status).toBe("ready");
  expect(r1.autonomous).toBe(true);
});

test("returns correct migration counts", async () => {
  await writeTasksJsonl([
    { id: "t1", status: "open", refinement: "raw" },
    { id: "t2", status: "open", refinement: "autonomous" },
    { id: "t3", status: "done" },
    { id: "t4", status: "raw", autonomous: false }, // already migrated
  ]);

  const result = await migrateTaskSchema(tempDir);
  expect(result.jsonlMigrated).toBe(3);
});

test("handles empty tasks.jsonl gracefully", async () => {
  await writeTasksJsonl([]);
  const result = await migrateTaskSchema(tempDir);
  expect(result.jsonlMigrated).toBe(0);
  expect(result.mdMigrated).toBe(0);
});

test("handles missing tasks.jsonl gracefully", async () => {
  const result = await migrateTaskSchema(tempDir);
  expect(result.jsonlMigrated).toBe(0);
  expect(result.mdMigrated).toBe(0);
});

// ── migrateTaskSchema: markdown migration ─────────────────────────────────────

test("replaces **Refinement:** autonomous with **Autonomous:** true in markdown", async () => {
  await writeTaskMd(
    "t1.md",
    "# Task 1\n\n**Status:** open\n**Refinement:** autonomous\n\n## Body\n",
  );

  await migrateTaskSchema(tempDir);

  const content = await readTaskMd("t1.md");
  expect(content).toContain("**Autonomous:** true");
  expect(content).not.toContain("**Refinement:**");
});

test("replaces **Refinement:** raw with **Autonomous:** false in markdown", async () => {
  await writeTaskMd(
    "t1.md",
    "# Task 1\n\n**Status:** open\n**Refinement:** raw\n\n## Body\n",
  );

  await migrateTaskSchema(tempDir);

  const content = await readTaskMd("t1.md");
  expect(content).toContain("**Autonomous:** false");
  expect(content).not.toContain("**Refinement:**");
});

test("leaves markdown alone if **Autonomous:** already present", async () => {
  const original =
    "# Task 1\n\n**Status:** raw\n**Autonomous:** false\n\n## Body\n";
  await writeTaskMd("t1.md", original);

  const result = await migrateTaskSchema(tempDir);

  expect(result.mdMigrated).toBe(0);
  const content = await readTaskMd("t1.md");
  expect(content).toBe(original);
});

test("does not touch tasks.jsonl markdown file itself", async () => {
  // tasks.jsonl is not a .md file, so it should be ignored
  await writeTasksJsonl([{ id: "t1", status: "raw", autonomous: false }]);
  const result = await migrateTaskSchema(tempDir);
  expect(result.mdMigrated).toBe(0);
});

// ── migrateIdeaSchema ─────────────────────────────────────────────────────────

test("migrateIdeaSchema is a no-op and returns migrated:0", async () => {
  const result = await migrateIdeaSchema(tempDir);
  expect(result.migrated).toBe(0);
});
