import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { DOMUS_DIR, projectRoot } from "../../lib/jsonl.ts";
import { readTasks } from "../../lib/task-store.ts";
import { showHelp } from "./helpers.ts";

export async function cmdLog(args: string[]): Promise<void> {
  if (showHelp(args)) {
    console.log("Usage: domus task log <id> <message>");
    return;
  }

  const root = projectRoot();
  const [id, ...rest] = args;
  const message = rest.join(" ");

  if (!id || !message) {
    console.error("Usage: domus task log <id> <message>");
    process.exit(1);
  }

  const tasks = await readTasks(root);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString();
  const branch = task.branch ?? null;

  // Append to execution log
  const logsDir = join(root, DOMUS_DIR, "execution-logs");
  await mkdir(logsDir, { recursive: true });
  const logFile = join(logsDir, `${id}.md`);
  const logEntry = `## ${timestamp}

${message}

---
`;
  await appendFile(logFile, logEntry, "utf-8");

  // Append to audit log
  const auditFile = join(root, DOMUS_DIR, "audit.jsonl");
  const auditEntry = `${JSON.stringify({ id, message, timestamp, branch })}\n`;
  await appendFile(auditFile, auditEntry, "utf-8");

  console.log(`Logged to ${DOMUS_DIR}/execution-logs/${id}.md`);
}
