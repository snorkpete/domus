import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listProjects } from "../lib/projects.ts";
import { checkClaudeInstalled, launchSession } from "../lib/session.ts";
import { resolveWorkspace } from "../lib/workspace.ts";
import { buildOraclePrompt } from "../personas/oracle.ts";

export async function runIdea(args: string[] = []): Promise<void> {
  const contextFlagIndex = args.indexOf("--context");
  const context =
    contextFlagIndex !== -1 ? args[contextFlagIndex + 1] : undefined;
  if (!checkClaudeInstalled()) {
    console.error(
      "Claude Code CLI not found. Install it from https://claude.ai/claude-code",
    );
    process.exit(1);
  }

  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspace();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const projects = await listProjects();
  const prompt = buildOraclePrompt({ workspacePath, projects, context });

  const domusDir = join(workspacePath, ".domus");
  await mkdir(domusDir, { recursive: true });
  await writeFile(join(domusDir, "last-persona"), "oracle", "utf-8");

  await launchSession(prompt, workspacePath);
}
