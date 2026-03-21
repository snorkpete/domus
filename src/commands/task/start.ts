import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFlag } from "../../lib/args.ts";
import { DOMUS_DIR, projectRoot } from "../../lib/jsonl.ts";
import { upsertBoldField } from "../../lib/markdown.ts";
import { isValidTransition } from "../../lib/state-engine.ts";
import { extractId, findTask, showHelp, transitionTask } from "./helpers.ts";

export async function cmdStart(args: string[]): Promise<void> {
  if (showHelp(args)) {
    console.log("Usage: domus task start <id> --branch <branch>");
    return;
  }

  const root = projectRoot();
  const id = extractId(args, "Usage: domus task start <id> --branch <branch>");
  const branch = parseFlag(args, "--branch");

  if (!branch) {
    console.error("Usage: domus task start <id> --branch <branch>");
    process.exit(1);
  }

  const { tasks, task } = await findTask(root, id);

  if (!isValidTransition(task.status, "in-progress")) {
    console.error(
      `Cannot start task ${id}: invalid transition ${task.status} → in-progress`,
    );
    process.exit(1);
  }

  await transitionTask(root, tasks, task, "in-progress", { branch });

  // Write branch to task markdown frontmatter
  const filePath = join(root, task.file);
  if (existsSync(filePath)) {
    const content = await readFile(filePath, "utf-8");
    const updated = upsertBoldField(content, "Branch", branch, "Status");
    await writeFile(filePath, updated, "utf-8");
  }

  // Create execution log
  const logsDir = join(root, DOMUS_DIR, "execution-logs");
  await mkdir(logsDir, { recursive: true });
  const logFile = join(logsDir, `${id}.md`);
  const timestamp = new Date().toISOString();
  const logContent = `# Execution Log: ${id}

## Started
**Branch:** ${branch}
**Date:** ${timestamp}

---
`;
  await writeFile(logFile, logContent, "utf-8");

  console.log(`  Branch:    ${branch}`);
  console.log(`  Log:       ${DOMUS_DIR}/execution-logs/${id}.md`);
}
