import { readFileSync } from "node:fs";
import type { Project } from "./projects.ts";

const PROSE_PATH = new URL(
  "../templates/reference/staff/roles/oracle.md",
  import.meta.url,
);

type OracleContext = {
  workspacePath: string;
  projects: Project[];
  context?: string;
};

export function buildOraclePrompt(ctx: OracleContext): string {
  const template = readFileSync(PROSE_PATH, "utf-8");

  const projectList =
    ctx.projects.length > 0
      ? ctx.projects.map((p) => `  - ${p.name}: ${p.path}`).join("\n")
      : "  (no projects registered yet — use `domus add project` to register one)";

  const contextSection = ctx.context
    ? `## Butler handoff context\n\n${ctx.context}\n\nUse this to orient the session — it reflects what the human was discussing with Butler before entering the Study.`
    : "";

  return template
    .replaceAll("{{WORKSPACE}}", ctx.workspacePath)
    .replace("{{PROJECTS}}", projectList)
    .replace("{{CONTEXT}}", contextSection)
    .trim();
}
