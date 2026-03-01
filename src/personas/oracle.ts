import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "../lib/projects.ts";

const PROSE_PATH = join(import.meta.dir, "oracle.md");

type OracleContext = {
  workspacePath: string;
  projects: Project[];
};

export function buildOraclePrompt(ctx: OracleContext): string {
  const template = readFileSync(PROSE_PATH, "utf-8");

  const projectList =
    ctx.projects.length > 0
      ? ctx.projects.map((p) => `  - ${p.name}: ${p.path}`).join("\n")
      : "  (no projects registered yet — use `domus add project` to register one)";

  return template
    .replaceAll("{{WORKSPACE}}", ctx.workspacePath)
    .replace("{{PROJECTS}}", projectList)
    .trim();
}
