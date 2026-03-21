import { hasFlag, parseFlag } from "../../lib/args.ts";
import { projectRoot } from "../../lib/jsonl.ts";
import {
  DOCTOR_TRANSITIONS,
  isDoctorTransition,
} from "../../lib/state-engine.ts";
import { VALID_STATUSES } from "../../lib/task-store.ts";
import type { TaskStatus } from "../../lib/task-types.ts";
import { findTask, showHelp, transitionTask } from "./helpers.ts";

export async function cmdStatus(args: string[]): Promise<void> {
  if (showHelp(args)) {
    console.log(
      `Usage: domus task status <id> <${VALID_STATUSES.join("|")}> [--outcome <text>]`,
    );
    console.log(
      "\nDoctor power tool — use advance/cancel/defer/reopen for normal workflow.",
    );
    return;
  }

  const root = projectRoot();
  const [id, newStatus] = args;

  if (!id || !newStatus) {
    console.error(
      `Usage: domus task status <id> <${VALID_STATUSES.join("|")}>`,
    );
    process.exit(1);
  }

  if (!VALID_STATUSES.includes(newStatus as TaskStatus)) {
    console.error(
      `Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(", ")}`,
    );
    process.exit(1);
  }

  const { tasks, task } = await findTask(root, id);

  if (!isDoctorTransition(task.status, newStatus as TaskStatus)) {
    const allowed = DOCTOR_TRANSITIONS[task.status] ?? [];
    console.error(
      `Invalid transition: ${task.status} → ${newStatus}. Allowed: ${allowed.join(", ")}`,
    );
    process.exit(1);
  }

  const hasOutcomeFlag = hasFlag(args, "--outcome");
  const outcomeNote = parseFlag(args, "--outcome") || null;
  await transitionTask(root, tasks, task, newStatus as TaskStatus, {
    outcomeNote: hasOutcomeFlag ? outcomeNote : undefined,
  });
}
