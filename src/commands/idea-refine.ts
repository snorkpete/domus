import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFlag } from "../lib/args.ts";
import { DOMUS_DIR } from "../lib/jsonl.ts";
import { buildOraclePrompt } from "../lib/oracle.ts";
import { listProjects } from "../lib/projects.ts";
import { checkClaudeInstalled, launchSession } from "../lib/session.ts";
import { resolveWorkspace } from "../lib/workspace.ts";

export async function cmdRefine(args: string[]): Promise<void> {
  const context = parseFlag(args, "--context");

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

  const domusDir = join(workspacePath, DOMUS_DIR);
  await mkdir(domusDir, { recursive: true });
  await writeFile(join(domusDir, "last-persona"), "oracle", "utf-8");

  await launchSession(prompt, workspacePath);
}
