import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Project } from "../lib/projects.ts";
import { deriveProjectFromCwd, parseTaskFile } from "./dispatch.ts";

// --- parseTaskFile ---

describe("parseTaskFile", () => {
  async function makeTmpTask(content: string): Promise<string> {
    const dir = join(tmpdir(), `domus-dispatch-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const file = join(dir, "my-task.md");
    await writeFile(file, content, "utf-8");
    return file;
  }

  test("extracts ID and title from task frontmatter and heading", async () => {
    const file = await makeTmpTask(`# Task: do the thing

**ID:** do-the-thing
**Status:** open
**Refinement:** autonomous
`);
    const result = await parseTaskFile(file);
    expect(result.id).toBe("do-the-thing");
    expect(result.title).toBe("do the thing");
    expect(result.filePath).toBe(file);
    await rm(file);
  });

  test("falls back to filename when no ID field", async () => {
    const dir = join(tmpdir(), `domus-dispatch-test-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const file = join(dir, "some-task-id.md");
    await writeFile(file, "# just a heading\n\nno frontmatter", "utf-8");
    const result = await parseTaskFile(file);
    expect(result.id).toBe("some-task-id");
    await rm(file);
  });

  test("falls back to id when no title heading", async () => {
    const file = await makeTmpTask("**ID:** task-abc\n\nsome content");
    const result = await parseTaskFile(file);
    expect(result.id).toBe("task-abc");
    expect(result.title).toBe("task-abc");
    await rm(file);
  });
});

// --- deriveProjectFromCwd ---

describe("deriveProjectFromCwd", () => {
  const projects: Project[] = [
    { name: "alpha", path: "/code/alpha", added: "2026-01-01" },
    { name: "beta", path: "/code/beta", added: "2026-01-01" },
    { name: "alpha-sub", path: "/code/alpha/sub", added: "2026-01-01" },
  ];

  test("returns project whose path matches cwd exactly", () => {
    const result = deriveProjectFromCwd("/code/alpha", projects);
    expect(result?.name).toBe("alpha");
  });

  test("returns project whose path is a prefix of cwd (subdirectory)", () => {
    const result = deriveProjectFromCwd("/code/beta/src/lib", projects);
    expect(result?.name).toBe("beta");
  });

  test("returns longest-prefix match when multiple projects match", () => {
    // /code/alpha/sub/src matches both alpha and alpha-sub — should pick alpha-sub
    const result = deriveProjectFromCwd("/code/alpha/sub/src", projects);
    expect(result?.name).toBe("alpha-sub");
  });

  test("returns undefined when no project matches", () => {
    const result = deriveProjectFromCwd("/code/gamma", projects);
    expect(result).toBeUndefined();
  });
});
