import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

type DomusConfig = {
  workspace: string;
};

function getConfigDir(): string {
  return process.env.DOMUS_CONFIG_DIR ?? join(homedir(), ".config", "domus");
}

function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export async function resolveWorkspace(): Promise<string> {
  const file = Bun.file(getConfigPath());
  if (!(await file.exists())) {
    throw new Error(
      "No Domus workspace configured. Run `domus init` in your workspace directory.",
    );
  }
  const config: DomusConfig = await file.json();
  if (!config.workspace) {
    throw new Error(
      "Domus config is malformed. Run `domus init` to reinitialise.",
    );
  }
  return config.workspace;
}

export async function readWorkspaceConfig(): Promise<DomusConfig | null> {
  const file = Bun.file(getConfigPath());
  if (!(await file.exists())) return null;
  return file.json();
}

export async function writeWorkspaceConfig(
  workspacePath: string,
): Promise<void> {
  await mkdir(getConfigDir(), { recursive: true });
  const config: DomusConfig = { workspace: workspacePath };
  await Bun.write(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`);
}
