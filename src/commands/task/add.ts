import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  hasFlag,
  parseFlag,
  toKebabCase,
  uniqueId,
  validateEnum,
} from "../../lib/args.ts";
import { DOMUS_DIR, projectRoot, today } from "../../lib/jsonl.ts";
import {
  VALID_PRIORITIES,
  readTasks,
  writeTasks,
} from "../../lib/task-store.ts";
import type { TaskEntry } from "../../lib/task-types.ts";
import { showHelp } from "./helpers.ts";

export async function cmdAdd(args: string[]): Promise<void> {
  if (showHelp(args)) {
    console.log("Usage: domus task add --title <title> [options]");
    console.log(
      "Options: --summary <text> --tags <tag1,tag2> --priority <high|normal|low>",
    );
    console.log("         --autonomous --parent <id> --depends-on <id1,id2>");
    console.log("         --idea <idea-id> --outcome <text> --note <text>");
    console.log("         --wont-fix  Create task directly in wont-fix status");
    return;
  }

  const root = projectRoot();
  const title = parseFlag(args, "--title");
  if (!title) {
    console.error("Usage: domus task add --title <title> [options]");
    process.exit(1);
  }

  const summary = parseFlag(args, "--summary") ?? "";
  const tags =
    parseFlag(args, "--tags")
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? [];
  const priority = validateEnum(
    parseFlag(args, "--priority") ?? "normal",
    VALID_PRIORITIES,
    "priority",
  );
  const autonomous = hasFlag(args, "--autonomous");
  const wontFix = hasFlag(args, "--wont-fix");
  const parentId = parseFlag(args, "--parent") ?? null;
  const dependsOn =
    parseFlag(args, "--depends-on")
      ?.split(",")
      .map((d) => d.trim())
      .filter(Boolean) ?? [];
  const ideaId = parseFlag(args, "--idea") ?? null;
  const outcomeNote = parseFlag(args, "--outcome") || null;
  const note = parseFlag(args, "--note");

  const tasks = await readTasks(root);
  const existingIds = tasks.map((t) => t.id);
  const baseId = toKebabCase(title);
  const id = uniqueId(baseId, existingIds);
  const file = `${DOMUS_DIR}/tasks/${id}.md`;
  const dateToday = today();

  const entry: TaskEntry = {
    id,
    title,
    file,
    date_captured: dateToday,
    status: wontFix ? "wont-fix" : "raw",
    autonomous,
    priority,
    parent_id: parentId,
    depends_on: dependsOn,
    idea_id: ideaId,
    spec_refs: [],
    tags,
    summary,
    notes: note ? [note] : [],
    date_status_changed: dateToday,
    date_done: null,
    outcome_note: outcomeNote,
  };

  tasks.push(entry);
  await writeTasks(root, tasks);

  const detailPath = join(root, file);
  const dependsOnStr = dependsOn.length > 0 ? dependsOn.join(", ") : "none";
  const initialStatus = wontFix ? "wont-fix" : "raw";
  const detailContent = wontFix
    ? `# Task: ${title}

**ID:** ${id}
**Status:** wont-fix
**Autonomous:** ${autonomous}
**Priority:** ${priority}
**Captured:** ${dateToday}
**Parent:** ${parentId ?? "none"}
**Depends on:** ${dependsOnStr}
**Idea:** ${ideaId ?? "none"}
**Spec refs:** none

---

## What This Task Is

${summary || "_No description yet._"}
`
    : `# Task: ${title}

**ID:** ${id}
**Status:** ${initialStatus}
**Autonomous:** ${autonomous}
**Priority:** ${priority}
**Captured:** ${dateToday}
**Parent:** ${parentId ?? "none"}
**Depends on:** ${dependsOnStr}
**Idea:** ${ideaId ?? "none"}
**Spec refs:** none

---

## What This Task Is

${summary || "_No description yet._"}

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
`;

  await writeFile(detailPath, detailContent, "utf-8");
  console.log(`Task created: ${id}`);
  console.log(`  Title:  ${title}`);
  console.log(`  File:   ${file}`);
}
