import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listProjects, registerProject, resolveProject } from "./projects.ts";

let tempWorkspace: string;
let originalCwd: string;

const PROJECTS_MD_HEADER = `# Projects

<!-- Managed by Domus. Edit with care — this is the project registry. -->

| Name | Path | Added |
|------|------|-------|
`;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempWorkspace = await mkdtemp(join(tmpdir(), "domus-workspace-"));
  await mkdir(join(tempWorkspace, ".domus"), { recursive: true });
  process.chdir(tempWorkspace);
  await writeFile(join(tempWorkspace, "projects.md"), PROJECTS_MD_HEADER);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempWorkspace, { recursive: true, force: true });
});

test("listProjects returns empty array when no projects registered", async () => {
  expect(await listProjects()).toEqual([]);
});

test("listProjects parses registered projects correctly", async () => {
  await writeFile(
    join(tempWorkspace, "projects.md"),
    `${PROJECTS_MD_HEADER}| myapp | /code/myapp | 2026-02-28 |\n`,
  );
  const projects = await listProjects();
  expect(projects).toHaveLength(1);
  expect(projects[0]).toEqual({
    name: "myapp",
    path: "/code/myapp",
    added: "2026-02-28",
  });
});

test("listProjects parses multiple projects", async () => {
  await writeFile(
    join(tempWorkspace, "projects.md"),
    `${PROJECTS_MD_HEADER}| alpha | /code/alpha | 2026-01-01 |\n| beta | /code/beta | 2026-02-01 |\n`,
  );
  const projects = await listProjects();
  expect(projects).toHaveLength(2);
  expect(projects[0].name).toBe("alpha");
  expect(projects[1].name).toBe("beta");
});

test("resolveProject returns project by name", async () => {
  await writeFile(
    join(tempWorkspace, "projects.md"),
    `${PROJECTS_MD_HEADER}| myapp | /code/myapp | 2026-02-28 |\n`,
  );
  const project = await resolveProject("myapp");
  expect(project.name).toBe("myapp");
  expect(project.path).toBe("/code/myapp");
});

test("resolveProject throws with helpful message when not found", async () => {
  await expect(resolveProject("nonexistent")).rejects.toThrow(
    "domus add project",
  );
});

test("registerProject appends row to projects.md", async () => {
  await registerProject({
    name: "myapp",
    path: "/code/myapp",
    added: "2026-02-28",
  });
  const projects = await listProjects();
  expect(projects).toHaveLength(1);
  expect(projects[0].name).toBe("myapp");
});

test("registerProject creates store subdirectories", async () => {
  await registerProject({
    name: "myapp",
    path: "/code/myapp",
    added: "2026-02-28",
  });
  for (const dir of ["ideas", "tasks", "specs", "decisions"]) {
    expect(existsSync(join(tempWorkspace, "store", "myapp", dir))).toBe(true);
  }
});
