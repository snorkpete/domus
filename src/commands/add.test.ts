import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAdd } from "./add.ts";

let tempWorkspace: string;
let tempConfigDir: string;

const PROJECTS_MD_HEADER = `# Projects

<!-- Managed by Domus. Edit with care — this is the project registry. -->

| Name | Path | Added |
|------|------|-------|
`;

async function makeGitRepo(dir: string): Promise<void> {
  Bun.spawnSync(["git", "init", dir]);
  Bun.spawnSync(["git", "-C", dir, "config", "user.email", "test@test.com"]);
  Bun.spawnSync(["git", "-C", dir, "config", "user.name", "Test"]);
  await writeFile(join(dir, "README.md"), "test");
  Bun.spawnSync(["git", "-C", dir, "add", "."]);
  Bun.spawnSync(["git", "-C", dir, "commit", "-m", "init"]);
}

beforeEach(async () => {
  tempWorkspace = await mkdtemp(join(tmpdir(), "domus-workspace-"));
  tempConfigDir = await mkdtemp(join(tmpdir(), "domus-config-"));
  process.env.DOMUS_CONFIG_DIR = tempConfigDir;
  await Bun.write(
    join(tempConfigDir, "config.json"),
    JSON.stringify({ workspace: tempWorkspace }),
  );
  await writeFile(join(tempWorkspace, "projects.md"), PROJECTS_MD_HEADER);
});

afterEach(async () => {
  await rm(tempWorkspace, { recursive: true, force: true });
  await rm(tempConfigDir, { recursive: true, force: true });
  process.env.DOMUS_CONFIG_DIR = undefined;
});

test("registers a local git repo", async () => {
  const localRepo = await mkdtemp(join(tmpdir(), "domus-repo-"));
  try {
    await makeGitRepo(localRepo);
    await runAdd(["project", localRepo]);
    const content = await Bun.file(join(tempWorkspace, "projects.md")).text();
    expect(content).toContain(localRepo);
  } finally {
    await rm(localRepo, { recursive: true, force: true });
  }
});

test("creates store directories when registering a local repo", async () => {
  const localRepo = await mkdtemp(join(tmpdir(), "domus-testrepo-"));
  try {
    await makeGitRepo(localRepo);
    const name = localRepo.split("/").at(-1) ?? "";
    await runAdd(["project", localRepo]);
    for (const dir of ["ideas", "tasks", "specs", "decisions"]) {
      expect(existsSync(join(tempWorkspace, "store", name, dir))).toBe(true);
    }
  } finally {
    await rm(localRepo, { recursive: true, force: true });
  }
});

test("errors on non-existent local path", async () => {
  let exited = false;
  const orig = process.exit;
  process.exit = (() => {
    exited = true;
    throw new Error("exit");
  }) as never;
  try {
    await runAdd(["project", "/does/not/exist"]);
  } catch {
    // expected
  } finally {
    process.exit = orig;
  }
  expect(exited).toBe(true);
});

test("errors on path that is not a git repo", async () => {
  const notARepo = await mkdtemp(join(tmpdir(), "domus-notrepo-"));
  let exited = false;
  const orig = process.exit;
  process.exit = (() => {
    exited = true;
    throw new Error("exit");
  }) as never;
  try {
    await runAdd(["project", notARepo]);
  } catch {
    // expected
  } finally {
    process.exit = orig;
    await rm(notARepo, { recursive: true, force: true });
  }
  expect(exited).toBe(true);
});

test("errors on duplicate project name", async () => {
  const localRepo = await mkdtemp(join(tmpdir(), "domus-duperepo-"));
  let exited = false;
  const orig = process.exit;
  try {
    await makeGitRepo(localRepo);
    await runAdd(["project", localRepo]);
    process.exit = (() => {
      exited = true;
      throw new Error("exit");
    }) as never;
    await runAdd(["project", localRepo]);
  } catch {
    // expected
  } finally {
    process.exit = orig;
    await rm(localRepo, { recursive: true, force: true });
  }
  expect(exited).toBe(true);
});

test("clones from url using provided cloneFn and registers project", async () => {
  const sourceRepo = await mkdtemp(join(tmpdir(), "domus-source-"));
  try {
    await makeGitRepo(sourceRepo);
    const cloneFn = (url: string, dest: string) => {
      return Bun.spawnSync(["git", "clone", url, dest]);
    };
    await runAdd(
      ["project", `https://example.com/${sourceRepo.split("/").at(-1)}.git`],
      {
        cloneFn: (_url, dest) =>
          Bun.spawnSync(["git", "clone", sourceRepo, dest]),
      },
    );
    const content = await Bun.file(join(tempWorkspace, "projects.md")).text();
    expect(content.length).toBeGreaterThan(PROJECTS_MD_HEADER.length);
  } finally {
    await rm(sourceRepo, { recursive: true, force: true });
  }
});

test("cleans up on clone failure", async () => {
  const failClone = () => ({
    exitCode: 1,
    stderr: Buffer.from("clone failed"),
  });
  let exited = false;
  const orig = process.exit;
  process.exit = (() => {
    exited = true;
    throw new Error("exit");
  }) as never;
  try {
    await runAdd(["project", "https://example.com/fake.git"], {
      cloneFn: failClone as never,
    });
  } catch {
    // expected
  } finally {
    process.exit = orig;
  }
  expect(exited).toBe(true);
  expect(existsSync(join(tempWorkspace, "projects", "fake"))).toBe(false);
});
