import { existsSync } from "node:fs";
import { realpath } from "node:fs/promises";
import { join, resolve } from "node:path";

export async function resolveWorkspace(): Promise<string> {
  const cwd = resolve(process.cwd());
  if (!existsSync(join(cwd, ".domus"))) {
    throw new Error(
      "No .domus/ directory found in current directory. Run `domus init` to initialise a workspace.",
    );
  }
  return realpath(cwd);
}
