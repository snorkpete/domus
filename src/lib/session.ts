export function checkClaudeInstalled(): boolean {
  const result = Bun.spawnSync(["which", "claude"]);
  return result.exitCode === 0;
}

export async function launchSession(
  prompt: string,
  cwd: string,
): Promise<void> {
  const proc = Bun.spawn(["claude", "--append-system-prompt", prompt], {
    cwd,
    stdio: ["inherit", "inherit", "inherit"],
  });
  await proc.exited;
}
