import { projectRoot } from "../lib/jsonl.ts";
import { setBranch } from "../lib/update-steps.ts";

const USAGE = `
domus config — manage Domus project configuration

Usage:
  domus config set-branch [<branch>]   Set the base branch in .domus/config.json
  domus config --help                  Print this help

Commands:
  set-branch [<branch>]
    Update the branch recorded in .domus/config.json.
    If <branch> is omitted, detects the current git branch.
    Creates .domus/config.json if it does not exist.
`.trim();

type ConfigOptions = {
  projectPath?: string;
};

export async function runConfig(
  args: string[],
  options: ConfigOptions = {},
): Promise<void> {
  const subcommand = args[0];

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(USAGE);
    return;
  }

  if (subcommand === "set-branch") {
    const projectPath = options.projectPath ?? projectRoot();
    const explicitBranch = args[1];
    const branch = await setBranch(projectPath, explicitBranch);
    console.log(`Branch set to: ${branch}`);
    return;
  }

  console.error(`Unknown config subcommand: ${subcommand}`);
  console.log(USAGE);
  process.exit(1);
}
