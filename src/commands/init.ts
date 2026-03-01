import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { readWorkspaceConfig, writeWorkspaceConfig } from "../lib/workspace.ts";

const WORKSPACE_DIRS = [
  "projects",
  "worktrees",
  "store/global/ideas",
  "store/global/tasks",
  "store/global/decisions",
  ".domus/workers",
  ".domus/logs",
];

const PROJECTS_MD = `# Projects

<!-- Managed by Domus. Edit with care — this is the project registry. -->

| Name | Path | Added |
|------|------|-------|
`;

const GITIGNORE = `projects/
worktrees/
.domus/
`;

const CLAUDE_SETTINGS = JSON.stringify(
  {
    permissions: {
      allow: [
        "Bash(git *)",
        "Bash(git -C *)",
        "Bash(cd * && git *)",
        "Bash(bun *)",
        "Read",
        "Edit",
        "Write",
        "Glob",
        "Grep",
      ],
    },
  },
  null,
  2,
);

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

type InitOptions = {
  workspacePath?: string;
  confirmFn?: (message: string) => Promise<boolean>;
};

export async function runInit(
  args: string[],
  options: InitOptions = {},
): Promise<void> {
  const force = args.includes("--force");
  const workspacePath = options.workspacePath ?? resolve(process.cwd());
  const confirmFn = options.confirmFn ?? confirm;

  if (existsSync(`${workspacePath}/.domus`)) {
    await writeWorkspaceConfig(workspacePath);
    console.log("This directory is already a Domus workspace.");
    return;
  }

  const existingConfig = await readWorkspaceConfig();
  if (existingConfig && existingConfig.workspace !== workspacePath) {
    if (!force) {
      const ok = await confirmFn(
        `A Domus workspace already exists at: ${existingConfig.workspace}\nOverwrite?`,
      );
      if (!ok) {
        console.log("Aborted. Pass --force to override without prompting.");
        return;
      }
    }
  }

  for (const dir of WORKSPACE_DIRS) {
    await mkdir(`${workspacePath}/${dir}`, { recursive: true });
  }

  await mkdir(`${workspacePath}/.claude`, { recursive: true });
  await Bun.write(`${workspacePath}/projects.md`, PROJECTS_MD);
  await Bun.write(`${workspacePath}/.gitignore`, GITIGNORE);
  await Bun.write(
    `${workspacePath}/.claude/settings.json`,
    `${CLAUDE_SETTINGS}\n`,
  );
  await writeWorkspaceConfig(workspacePath);

  console.log(`Domus workspace initialised at: ${workspacePath}`);
}
