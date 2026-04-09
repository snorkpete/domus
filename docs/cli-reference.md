# Domus CLI Reference

Complete reference for `domus` command syntax and flags. Read this when using the CLI directly to avoid trial-and-error.

---

## Global options

These flags are accepted before any subcommand:

| Flag | Description |
|------|-------------|
| `--root <path>` | Override the project root — targets a specific project's `.domus/` directory. Sets `DOMUS_ROOT` internally. |
| `--version`, `-v` | Print the installed version. |
| `--help`, `-h` | Print top-level usage. |

`DOMUS_ROOT` can also be set as an environment variable (workers set this automatically via `domus dispatch`).

---

## domus / domus work / domus connect

Connect to a Butler session (interactive persona launcher).

```
domus
domus work
domus connect
```

All three are equivalent. Launches an interactive Claude session with the Butler persona loaded.

---

## domus init

Initialise a Domus workspace in the current project directory.

```
domus init
```

Creates `.domus/` directory structure (ideas, tasks, specs, tags), seed files, and merges required permissions into `.claude/settings.json`. Safe to re-run — skips files that already exist.

**Creates:**
- `.domus/ideas/ideas.jsonl`
- `.domus/tasks/tasks.jsonl`
- `.domus/tags/shared.md`, `ideas.md`, `tasks.md`
- `.claude/settings.json` (created or updated with Domus permissions)

---

## domus add project

Register a project with the Domus workspace.

```
domus add project <git-url-or-local-path>
```

**Arguments:**
- `<git-url-or-local-path>` — A git URL (clones into the workspace) or a local path to an existing git repository (registers in place).

**Examples:**
```
domus add project https://github.com/org/myrepo.git
domus add project ~/code/myproject
```

---

## domus config

Manage Domus project configuration.

```
domus config <subcommand>
domus config --help
```

### domus config set-branch

Update the base branch recorded in `.domus/config.json`.

```
domus config set-branch [<branch>]
```

**Arguments:**
- `<branch>` — (optional) Branch name to record. If omitted, the current git branch is detected automatically.

**Behaviour:**
- Creates `.domus/config.json` if it does not exist.
- Prints confirmation: `Branch set to: <branch>`

**Examples:**
```
domus config set-branch
domus config set-branch main
domus config set-branch feature/my-branch
```

Use this after renaming your default branch (e.g. `master` → `main`), or to explicitly set the base branch without re-running `domus init`.

---

## domus dispatch

Dispatch a worker to execute a ticket autonomously.

```
domus dispatch <ticket-file>
```

**Arguments:**
- `<ticket-file>` — Path to a ticket markdown file describing the work.

Creates a git worktree, sets up `DOMUS_ROOT`, and launches a Claude worker session. The project referenced in the ticket must already be registered (`domus add project`).

**Output:**
```
Dispatched worker <worker-id>
  Branch:   <branch-name>
  Worktree: <path>
  PID:      <pid>
```

---

## domus task

Task management subcommands.

```
domus task <subcommand>
domus task --help
```

### domus task add

Create a new task.

```
domus task add --title <title> [options]
```

**Required:**
- `--title <title>` — Task title (used to generate the task ID via kebab-case conversion).

**Optional:**
| Flag | Description | Default |
|------|-------------|---------|
| `--summary <text>` | One-line summary. | (empty) |
| `--tags <tag1,tag2>` | Comma-separated tags. | (none) |
| `--priority <value>` | `high`, `normal`, or `low`. | `normal` |
| `--refinement <value>` | `raw`, `proposed`, `refined`, or `autonomous`. | `raw` |
| `--parent <id>` | Parent task ID (for subtasks). | (none) |
| `--depends-on <id1,id2>` | Comma-separated dependency task IDs. | (none) |
| `--idea <idea-id>` | Link to an originating idea. | (none) |
| `--wont-fix` | Create task directly in `wont-fix` status. Omits Acceptance Criteria and Implementation Notes sections from the task file. | — |

**Output:** Prints the generated task ID and file path.

**Example:**
```
domus task add --title "Add login page" --priority high --refinement proposed
```

---

### domus task status

Update a task's status.

```
domus task status <id> <new-status> [--note <text>]
```

**Arguments:**
- `<id>` — Task ID.
- `<new-status>` — One of: `open`, `in-progress`, `done`, `cancelled`, `deferred`.

**Optional:**
- `--note <text>` — Outcome note (stored on the task record).

**Notes:**
- Setting `done` records `date_done`.
- If all subtasks of a parent task are done, a hint is printed suggesting you mark the parent done.

**Example:**
```
domus task status add-login-page in-progress
domus task status add-login-page done --note "Shipped in v1.2"
```

---

### domus task wontfix

Mark a task as won't-fix — a deliberate decision not to act on it.

```
domus task wontfix <id> [--note <text>]
```

**Arguments:**
- `<id>` — Task ID.

**Optional:**
- `--note <text>` — Reason for the won't-fix decision (stored as outcome note).

**Notes:**
- Reachable from any active state (raw, proposed, ready, in-progress).
- Won't-fix tasks can be reopened with `domus task reopen` (transitions to `raw`).
- Displayed with `⊘` icon.
- Excluded from `domus task list` and `domus task overview` by default.

**Example:**
```
domus task wontfix add-login-page --note "Out of scope for v1"
```

---

### domus task update

Update metadata fields on a task.

```
domus task update <id> [flags]
```

**Arguments:**
- `<id>` — Task ID.

**Flags (at least one required):**
| Flag | Description |
|------|-------------|
| `--title <title>` | Update the task title. |
| `--summary <text>` | Update the summary. |
| `--tags <tag1,tag2>` | Replace the tag list. |
| `--priority <value>` | `high`, `normal`, or `low`. |
| `--refinement <value>` | `raw`, `proposed`, `refined`, or `autonomous`. |
| `--depends-on <id1,id2>` | Replace dependency list (empty string clears it). |
| `--note <text>` | Set the outcome note. |
| `--parent <id>` | Set or change the parent task (empty string clears it). |
| `--idea <id>` | Link or update the originating idea (empty string clears it). |

Syncs changes to both `tasks.jsonl` and the task's `.md` file.

**Example:**
```
domus task update add-login-page --refinement autonomous --priority high
domus task update add-login-page --depends-on "design-mockup,setup-auth"
```

---

### domus task show

Print full detail for a single task.

```
domus task show <id>
```

**Arguments:**
- `<id>` — Task ID.

Prints title, status, refinement, priority, captured date, parent, dependencies, idea link, tags, summary, and outcome note.

---

### domus task list

List all tasks.

```
domus task list [--status <status>] [--wont-fix] [--json]
```

**Optional:**
| Flag | Description |
|------|-------------|
| `--status <value>` | Filter by status: `raw`, `proposed`, `ready`, `in-progress`, `done`, `cancelled`, `deferred`, `wont-fix`. |
| `--wont-fix` | Include won't-fix tasks alongside active tasks (won't-fix tasks are excluded by default). |
| `--json` | Output full task records as JSON array. |

**Default behaviour:** Excludes `done` and `wont-fix` tasks. Use `--status done` or `--status wont-fix` to see them, or `--wont-fix` to include won't-fix alongside active tasks.

**Example:**
```
domus task list
domus task list --status wont-fix
domus task list --wont-fix
domus task list --json
```

---

### domus task ready

Show what's ready to work on, grouped by readiness.

```
domus task ready
```

Prints three sections:
- **In Progress** — tasks currently being worked on.
- **Ready (Autonomous)** — open tasks with `refinement: autonomous` and all dependencies met.
- **Ready (Supervised)** — open tasks with other refinement levels and all dependencies met.
- **Blocked** — tasks with unmet dependencies.

---

### domus task overview

Compact overview grouped by Autonomous / Blocked / Supervised. Designed for use with `watch`.

```
domus task overview [--include-done] [--wont-fix]
```

**Optional:**
| Flag | Description |
|------|-------------|
| `--include-done` | Include done tasks in the output. |
| `--wont-fix` | Include won't-fix tasks in the output (shown in a "Won't Fix" section). |

Displays tasks with ANSI colour coding:
- Priority icons: `▲` (high), `·` (normal), `▼` (low)
- Status icons: `○` raw, `◐` proposed, `◎` ready, `◑` in-progress, `●` done, `✕` cancelled, `⏸` deferred, `⊘` won't-fix, `⊗` blocked

Each row shows the task ID only (no title). Use `domus task show <id>` for detail.

---

### domus task watch

Live-refresh overview via `watch(1)`.

```
domus task watch [--interval <seconds>] [--include-done]
```

**Optional:**
| Flag | Description | Default |
|------|-------------|---------|
| `--interval <seconds>` | Refresh interval in seconds. | `10` |
| `--include-done` | Pass through to `domus task overview`. | — |

Requires `watch` to be installed (`brew install watch` on macOS). Passes extra flags through to `domus task overview`.

**Example:**
```
domus task watch
domus task watch --interval 30
domus task watch --interval 15 --include-done
```

---

## domus idea

Idea management subcommands.

```
domus idea <subcommand>
domus idea --help
```

### domus idea add

Create a new idea.

```
domus idea add --title <title> [options]
```

**Required:**
- `--title <title>` — Idea title (used to generate the idea ID).

**Optional:**
| Flag | Description | Default |
|------|-------------|---------|
| `--summary <text>` | One-line summary. | (empty) |
| `--tags <tag1,tag2>` | Comma-separated tags. | (none) |
| `--status <value>` | `raw`, `refined`, `scoped`, `implemented`, `abandoned`, or `deferred`. | `raw` |

**Output:** Prints the generated idea ID.

---

### domus idea status

Update an idea's status.

```
domus idea status <id> <new-status> [--note <text>]
```

**Arguments:**
- `<id>` — Idea ID.
- `<new-status>` — One of: `raw`, `refined`, `scoped`, `implemented`, `abandoned`, `deferred`.

**Optional:**
- `--note <text>` — Outcome note. Required when setting status to `abandoned` or `deferred`.

**Example:**
```
domus idea status my-idea refined
domus idea status my-idea abandoned --note "Superseded by better approach"
```

---

### domus idea update

Update metadata fields on an idea.

```
domus idea update <id> [flags]
```

**Flags (at least one required):**
| Flag | Description |
|------|-------------|
| `--title <title>` | Update the idea title. |
| `--summary <text>` | Update the summary. |
| `--tags <tag1,tag2>` | Replace the tag list. |

---

### domus idea show

Print full detail for a single idea.

```
domus idea show <id>
```

Prints title, status, captured date, tags, summary, outcome note, and implementation date.

---

### domus idea list

List all ideas.

```
domus idea list [--status <status>] [--json]
```

**Optional:**
| Flag | Description |
|------|-------------|
| `--status <value>` | Filter by status. |
| `--json` | Output full idea records as JSON array. |

---

### domus idea overview

Show active ideas grouped by status.

```
domus idea overview [--filter <filter>]
```

**Optional:**
| Flag | Description | Default |
|------|-------------|---------|
| `--filter <value>` | `active`, `raw`, `refined`, `scoped`, `implemented`, `parked`, `all`. | `active` |

`active` groups: raw (needs refinement), refined (ready to scope), scoped (tasked).
`parked` includes abandoned and deferred ideas.

---

### domus idea refine

Launch an Oracle ideation session.

```
domus idea refine [--context <text>]
```

**Optional:**
- `--context <text>` — Additional context passed to the Oracle persona prompt.

Requires Claude Code CLI to be installed.
