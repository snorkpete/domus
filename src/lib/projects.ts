import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { resolveWorkspace } from "./workspace.ts";

export type Project = {
  name: string;
  path: string;
  added: string; // YYYY-MM-DD
};

function parseProjectsTable(content: string): Project[] {
  const projects: Project[] = [];
  let pastHeader = false;

  for (const line of content.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (/^\|[-\s|]+\|$/.test(line)) continue; // separator row

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cells.length !== 3) continue;
    if (cells[0] === "Name") {
      pastHeader = true;
      continue;
    }
    if (!pastHeader) continue;

    projects.push({ name: cells[0], path: cells[1], added: cells[2] });
  }

  return projects;
}

export async function listProjects(): Promise<Project[]> {
  const workspace = await resolveWorkspace();
  const file = Bun.file(join(workspace, "projects.md"));
  if (!(await file.exists())) return [];
  return parseProjectsTable(await file.text());
}

export async function resolveProject(name: string): Promise<Project> {
  const projects = await listProjects();
  const project = projects.find((p) => p.name === name);
  if (!project) {
    throw new Error(
      `Project "${name}" not found. Run \`domus add project\` to register it.`,
    );
  }
  return project;
}

export async function registerProject(project: Project): Promise<void> {
  const workspace = await resolveWorkspace();

  for (const dir of ["ideas", "tasks", "specs", "decisions"]) {
    await mkdir(join(workspace, "store", project.name, dir), {
      recursive: true,
    });
  }

  const projectsFile = join(workspace, "projects.md");
  const content = await Bun.file(projectsFile).text();
  const row = `| ${project.name} | ${project.path} | ${project.added} |\n`;
  await Bun.write(projectsFile, content + row);
}
