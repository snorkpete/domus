import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { join } from "node:path";
import { listProjects, registerProject } from "../lib/projects.ts";
import { resolveWorkspace } from "../lib/workspace.ts";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isUrl(target: string): boolean {
  return (
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("git@") ||
    target.startsWith("ssh://")
  );
}

function nameFromUrl(url: string): string {
  const last = url.split("/").at(-1) ?? url;
  return last.replace(/\.git$/, "");
}

type SpawnResult = { exitCode: number | null; stderr: Uint8Array };
type CloneFn = (url: string, dest: string) => SpawnResult;

function defaultClone(url: string, dest: string): SpawnResult {
  return Bun.spawnSync(["git", "clone", url, dest]);
}

type AddOptions = {
  cloneFn?: CloneFn;
};

async function addFromUrl(url: string, cloneFn: CloneFn): Promise<void> {
  const name = nameFromUrl(url);
  const workspace = await resolveWorkspace();
  const dest = join(workspace, "projects", name);

  const projects = await listProjects();
  if (projects.some((p) => p.name === name)) {
    console.error(`Project "${name}" is already registered.`);
    process.exit(1);
  }

  const result = cloneFn(url, dest);
  if (result.exitCode !== 0) {
    await rm(dest, { recursive: true, force: true });
    console.error(
      `Failed to clone ${url}:\n${Buffer.from(result.stderr).toString()}`,
    );
    process.exit(1);
  }

  await registerProject({ name, path: dest, added: today() });
  console.log(`Project "${name}" cloned and registered at ${dest}.`);
}

async function addFromPath(localPath: string): Promise<void> {
  const absPath = resolve(localPath);

  if (!existsSync(absPath)) {
    console.error(`Path does not exist: ${absPath}`);
    process.exit(1);
  }

  if (!existsSync(join(absPath, ".git"))) {
    console.error(`Not a git repository: ${absPath}`);
    process.exit(1);
  }

  const name = basename(absPath);
  const projects = await listProjects();
  if (projects.some((p) => p.name === name)) {
    console.error(`Project "${name}" is already registered.`);
    process.exit(1);
  }

  await registerProject({ name, path: absPath, added: today() });
  console.log(`Project "${name}" registered at ${absPath}.`);
}

export async function runAdd(
  args: string[],
  options: AddOptions = {},
): Promise<void> {
  if (args[0] === "--help" || args[0] === "-h") {
    console.log("Usage: domus add project <git-url-or-local-path>");
    return;
  }

  const cloneFn = options.cloneFn ?? defaultClone;

  if (args[0] !== "project") {
    console.error(
      `Unknown add subcommand: ${args[0] ?? "(none)"}\nUsage: domus add project <git-url-or-local-path>`,
    );
    process.exit(1);
  }

  const target = args[1];
  if (!target || target === "--help" || target === "-h") {
    console.log("Usage: domus add project <git-url-or-local-path>");
    return;
  }

  if (isUrl(target)) {
    await addFromUrl(target, cloneFn);
  } else {
    await addFromPath(target);
  }
}
