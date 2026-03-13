import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFlag, hasFlag, toKebabCase, uniqueId } from "../lib/args.ts";
import {
  today,
  projectRoot,
  DOMUS_DIR,
  readJsonl,
  writeJsonl,
  updateMarkdownStatus,
} from "../lib/jsonl.ts";
import { listProjects } from "../lib/projects.ts";
import { checkClaudeInstalled, launchSession } from "../lib/session.ts";
import { resolveWorkspace } from "../lib/workspace.ts";
import { buildOraclePrompt } from "../personas/oracle.ts";

// ── Types ────────────────────────────────────────────────────────────────────

type IdeaStatus =
  | "raw"
  | "refined"
  | "scoped"
  | "implemented"
  | "abandoned"
  | "deferred";

type IdeaEntry = {
  id: string;
  title: string;
  file: string;
  date_captured: string | null;
  status: IdeaStatus;
  tags: string[];
  summary: string;
  date_status_changed: string | null;
  date_implemented: string | null;
  outcome_note: string | null;
};

// ── Store helpers ─────────────────────────────────────────────────────────────

function ideasJsonlPath(root: string): string {
  return join(root, DOMUS_DIR, "ideas", "ideas.jsonl");
}

function ideasDir(root: string): string {
  return join(root, DOMUS_DIR, "ideas");
}

async function readIdeas(root: string): Promise<IdeaEntry[]> {
  return readJsonl<IdeaEntry>(ideasJsonlPath(root));
}

async function writeIdeas(root: string, ideas: IdeaEntry[]): Promise<void> {
  return writeJsonl(ideasJsonlPath(root), ideasDir(root), ideas);
}

// ── Subcommands ──────────────────────────────────────────────────────────────

async function cmdAdd(args: string[]): Promise<void> {
  const root = projectRoot();
  const title = parseFlag(args, "--title");
  if (!title) {
    console.error("Usage: domus idea add --title <title> [options]");
    console.error(
      "Options: --summary <text> --tags <tag1,tag2> --status <status>",
    );
    process.exit(1);
  }

  const summary = parseFlag(args, "--summary") ?? "";
  const tags =
    parseFlag(args, "--tags")
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? [];
  const status = (parseFlag(args, "--status") ?? "raw") as IdeaStatus;

  const ideas = await readIdeas(root);
  const existingIds = ideas.map((i) => i.id);
  const baseId = toKebabCase(title);
  const id = uniqueId(baseId, existingIds);
  const file = `${DOMUS_DIR}/ideas/${id}.md`;
  const dateToday = today();

  const entry: IdeaEntry = {
    id,
    title,
    file,
    date_captured: dateToday,
    status,
    tags,
    summary,
    date_status_changed: dateToday,
    date_implemented: null,
    outcome_note: null,
  };

  ideas.push(entry);
  await writeIdeas(root, ideas);

  // Create detail file
  const detailPath = join(root, file);
  const detailContent = `# Idea: ${title}

**Date:** ${dateToday}
**Status:** ${status}

---

## The Idea

${summary || "_No description yet._"}

---

## Why This Is Worth Doing

_To be filled in._

---

## Open Questions / Things to Explore

- _Add open questions here_
`;

  await writeFile(detailPath, detailContent, "utf-8");
  console.log(id);
}

async function cmdStatus(args: string[]): Promise<void> {
  const root = projectRoot();
  const [id, newStatus] = args;

  if (!id || !newStatus) {
    console.error(
      "Usage: domus idea status <id> <raw|refined|scoped|implemented|abandoned|deferred> [--note <text>]",
    );
    process.exit(1);
  }

  const validStatuses: IdeaStatus[] = [
    "raw",
    "refined",
    "scoped",
    "implemented",
    "abandoned",
    "deferred",
  ];
  if (!validStatuses.includes(newStatus as IdeaStatus)) {
    console.error(
      `Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(", ")}`,
    );
    process.exit(1);
  }

  const requiresNote = ["abandoned", "deferred"];
  const note = parseFlag(args, "--note") ?? null;
  if (requiresNote.includes(newStatus) && !note) {
    console.error(`--note is required when setting status to "${newStatus}"`);
    process.exit(1);
  }

  const ideas = await readIdeas(root);
  const idea = ideas.find((i) => i.id === id);

  if (!idea) {
    console.error(`Idea not found: ${id}`);
    process.exit(1);
  }

  const oldStatus = idea.status;
  idea.status = newStatus as IdeaStatus;
  idea.date_status_changed = today();

  if (newStatus === "implemented") {
    idea.date_implemented = today();
  }
  if (note) {
    idea.outcome_note = note;
  }

  await writeIdeas(root, ideas);
  await updateMarkdownStatus(join(root, idea.file), newStatus);
  console.log(`Idea ${id}: ${oldStatus} → ${newStatus}`);
}

async function cmdOverview(args: string[]): Promise<void> {
  const root = projectRoot();
  const ideas = await readIdeas(root);

  if (ideas.length === 0) {
    console.log("No ideas found.");
    return;
  }

  const filter = parseFlag(args, "--filter") ?? "active";

  let filtered: IdeaEntry[];
  switch (filter) {
    case "active":
      filtered = ideas.filter((i) =>
        ["raw", "refined", "scoped"].includes(i.status),
      );
      break;
    case "raw":
      filtered = ideas.filter((i) => i.status === "raw");
      break;
    case "refined":
      filtered = ideas.filter((i) => i.status === "refined");
      break;
    case "scoped":
      filtered = ideas.filter((i) => i.status === "scoped");
      break;
    case "implemented":
      filtered = ideas.filter((i) => i.status === "implemented");
      break;
    case "parked":
      filtered = ideas.filter((i) =>
        ["abandoned", "deferred"].includes(i.status),
      );
      break;
    case "all":
      filtered = ideas;
      break;
    default:
      console.error(
        `Unknown filter: ${filter}. Use: active, raw, refined, scoped, implemented, parked, all`,
      );
      process.exit(1);
  }

  if (filtered.length === 0) {
    console.log(`No ideas matching filter: ${filter}`);
    return;
  }

  if (filter === "active") {
    const raw = filtered.filter((i) => i.status === "raw");
    const refined = filtered.filter((i) => i.status === "refined");
    const scoped = filtered.filter((i) => i.status === "scoped");

    const fmt = (i: IdeaEntry) =>
      `  ${i.id}\n    ${i.summary || i.title}`;

    if (raw.length > 0) {
      console.log("## Needs Refinement (raw)\n");
      raw.forEach((i) => console.log(fmt(i)));
      console.log();
    }
    if (refined.length > 0) {
      console.log("## Ready to Scope (refined)\n");
      refined.forEach((i) => console.log(fmt(i)));
      console.log();
    }
    if (scoped.length > 0) {
      console.log("## Tasked (scoped)\n");
      scoped.forEach((i) => console.log(fmt(i)));
      console.log();
    }
  } else {
    filtered.forEach((i) => {
      console.log(`  [${i.status}] ${i.id} — ${i.title}`);
      if (i.summary) console.log(`    ${i.summary}`);
    });
  }
}

async function cmdList(args: string[]): Promise<void> {
  const root = projectRoot();
  const ideas = await readIdeas(root);

  if (ideas.length === 0) {
    console.log("No ideas found.");
    return;
  }

  const filterStatus = parseFlag(args, "--status") as IdeaStatus | undefined;
  const filtered = filterStatus
    ? ideas.filter((i) => i.status === filterStatus)
    : ideas;

  if (hasFlag(args, "--json")) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  const statusIcon: Record<IdeaStatus, string> = {
    raw: "○",
    refined: "◑",
    scoped: "◕",
    implemented: "●",
    abandoned: "✕",
    deferred: "⏸",
  };

  filtered.forEach((i) => {
    const icon = statusIcon[i.status] ?? "?";
    console.log(`${icon} ${i.id} — ${i.title}`);
  });
}

async function cmdShow(args: string[]): Promise<void> {
  const root = projectRoot();
  const [id] = args;

  if (!id) {
    console.error("Usage: domus idea show <id>");
    process.exit(1);
  }

  const ideas = await readIdeas(root);
  const idea = ideas.find((i) => i.id === id);

  if (!idea) {
    console.error(`Idea not found: ${id}`);
    process.exit(1);
  }

  console.log(`# ${idea.title}`);
  console.log();
  console.log(`ID:        ${idea.id}`);
  console.log(`Status:    ${idea.status}`);
  console.log(`Captured:  ${idea.date_captured ?? "unknown"}`);
  console.log(`Tags:      ${idea.tags.length > 0 ? idea.tags.join(", ") : "none"}`);
  console.log(`Summary:   ${idea.summary || "(none)"}`);
  if (idea.outcome_note) console.log(`Outcome:   ${idea.outcome_note}`);
  if (idea.date_implemented) console.log(`Implemented: ${idea.date_implemented}`);
}

async function cmdUpdate(args: string[]): Promise<void> {
  const root = projectRoot();
  const [id] = args;

  if (!id) {
    console.error("Usage: domus idea update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>]");
    process.exit(1);
  }

  const ideas = await readIdeas(root);
  const idea = ideas.find((i) => i.id === id);

  if (!idea) {
    console.error(`Idea not found: ${id}`);
    process.exit(1);
  }

  const newTitle = parseFlag(args, "--title");
  const newSummary = parseFlag(args, "--summary");
  const newTags = parseFlag(args, "--tags")?.split(",").map((t) => t.trim()).filter(Boolean);

  if (!newTitle && !newSummary && !newTags) {
    console.error("Nothing to update. Provide at least one flag.");
    process.exit(1);
  }

  if (newTitle) idea.title = newTitle;
  if (newSummary) idea.summary = newSummary;
  if (newTags) idea.tags = newTags;

  await writeIdeas(root, ideas);

  // Sync .md file for fields that appear in the header
  const filePath = join(root, idea.file);
  if (newTitle && existsSync(filePath)) {
    const content = await readFile(filePath, "utf-8");
    const updated = content.replace(/^# Idea: .+$/m, `# Idea: ${newTitle}`);
    await writeFile(filePath, updated, "utf-8");
  }

  console.log(`Idea ${id} updated.`);
}

async function cmdRefine(args: string[]): Promise<void> {
  const context = parseFlag(args, "--context");

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
  const prompt = buildOraclePrompt({ workspacePath, projects, context });

  const domusDir = join(workspacePath, ".domus");
  await mkdir(domusDir, { recursive: true });
  await writeFile(join(domusDir, "last-persona"), "oracle", "utf-8");

  await launchSession(prompt, workspacePath);
}

// ── Entry point ──────────────────────────────────────────────────────────────

const IDEA_USAGE = `
domus idea — idea management

Usage:
  domus idea add --title <title> [options]
  domus idea status <id> <new-status> [--note <text>]
  domus idea update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>]
  domus idea show <id>
  domus idea overview [--filter <filter>]
  domus idea list [--status <status>] [--json]
  domus idea refine [--context <text>]

Subcommands:
  add       Create a new idea (writes to .domus/ideas/)
  status    Update idea status
  update    Update metadata fields (title, summary, tags)
  show      Print full detail for a single idea
  overview  Show active ideas grouped by status (default filter: active)
  list      List all ideas (flat, --json for machine-readable output)
  refine    Launch Oracle ideation session

Filters for overview:
  active (default), raw, refined, scoped, implemented, parked, all
`.trim();

export async function runIdea(args: string[] = []): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case "add":
      await cmdAdd(args.slice(1));
      break;
    case "status":
      await cmdStatus(args.slice(1));
      break;
    case "update":
      await cmdUpdate(args.slice(1));
      break;
    case "show":
      await cmdShow(args.slice(1));
      break;
    case "overview":
      await cmdOverview(args.slice(1));
      break;
    case "list":
      await cmdList(args.slice(1));
      break;
    case "refine":
      await cmdRefine(args.slice(1));
      break;
    case "--help":
    case "-h":
    case undefined:
      console.log(IDEA_USAGE);
      break;
    default:
      console.error(`Unknown idea subcommand: ${sub}`);
      console.error("Run `domus idea --help` for usage.");
      process.exit(1);
  }
}
