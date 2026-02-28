import { listProjects } from "../lib/projects.ts";
import { resolveWorkspace } from "../lib/workspace.ts";
import { buildOraclePrompt } from "../personas/oracle.ts";

function checkClaudeInstalled(): boolean {
  const result = Bun.spawnSync(["which", "claude"]);
  return result.exitCode === 0;
}

export async function runIdea(): Promise<void> {
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
  const prompt = buildOraclePrompt({ workspacePath, projects });

  const proc = Bun.spawn(["claude", "--append-system-prompt", prompt], {
    cwd: workspacePath,
    stdio: ["inherit", "inherit", "inherit"],
  });

  await proc.exited;
}
