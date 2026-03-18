# Domus — Workflow Instructions

## Before creating a task

Always check the existing task list before creating a new task. Run `domus task list` or scan `.domus/tasks/` to avoid duplicates — including cancelled tasks, which may be worth reopening rather than recreating.

## Task file editing rules

Task markdown files have two distinct parts — use the right tool for each:

- **Metadata fields** (frontmatter: status, refinement, priority, depends-on, etc.) — always update via `domus task update <id> --field value`. This keeps `tasks.jsonl` in sync. Direct file edits to frontmatter will silently diverge from the index and break `domus task overview` and other commands.
- **Status** is a separate subcommand: `domus task status <id> <value>`
- **Body content** (description, acceptance criteria, implementation notes) — edit the markdown file directly with Write/Edit tools. The CLI has no flags for body content.

## Task refinement lifecycle

`raw → proposed → refined → autonomous`

- **raw** — just captured, no refinement done (`~`)
- **proposed** — Claude has done a refinement pass (criteria written, shape clear) but the human hasn't reviewed yet (`◐`)
- **refined** — human has reviewed and confirmed (`◎`)
- **autonomous** — ready for a worker to execute without human input (no icon)

Only `autonomous` tasks appear in the Autonomous section of `domus task overview`. All others appear in Supervised.

## Task status values

`open` → `in-progress` → `done` | `cancelled` | `deferred`

Update via: `domus task status <id> <value>`

**CLI output icon reference** — icons used in `domus task list` and `domus task overview`:

| Icon | Meaning |
|------|---------|
| `○` | open |
| `◑` | in-progress |
| `●` | done |
| `✕` | cancelled |
| `⏸` | deferred |
| `⊘` | blocked |
| `▲` | high priority |
| `·` | normal priority |
| `▼` | low priority |
| `~` | raw refinement |
| `◐` | proposed refinement |
| `◎` | refined |

**`task add` and `task update` flags must mirror each other.** When a flag is added to one command, add it to the other in the same commit.

**Superseded tasks must be cancelled immediately.** If a task is superseded by another piece of work, cancel it (`domus task status <id> cancelled`) at the same time as writing any outcome note. A superseded note without a status change leaves the task misleadingly open.

## Ideas vs tasks

An **idea** is for exploring unknowns — "is this worth pursuing?" or "what are we even talking about?" Ideas are concepts under development. A task forms from an idea once it's clear something will be implemented.

A **task** is for known implementation work. Even if details need refinement, the direction is decided.

When in doubt: if you don't know whether something will be built, it's an idea. If you know it will, it's a task.

## Further reading (load when needed)

- `docs/cli-reference.md` — read when using the domus CLI directly (command syntax, flags)
- `decisions/000-vision.md` — read when scoping new features or when the right direction feels unclear
- `decisions/003-personas-vs-skills.md` — read when working with the persona system (Butler, Oracle, Worker)
- `decisions/004-domus-store-and-worker-logging.md` — read when working with autonomous dispatch, worktrees, or execution logs
