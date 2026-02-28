# Domus — Project Specification

## What is Domus?

Domus (Latin for "house" or "home") is a personal workflow and AI orchestration system — like n8n, Zapier, or Gas Town, but built to work the way its owner wants to work.

It is **not** a project-specific tool. It is a meta-layer that sits above all your projects on a machine, providing long-term memory and coordination across them.

### Architecture Layers

```
LLM (Claude)
  └── Claude Code       [context management, feedback loops, self-correction]
        └── Domus       [long-term memory, cross-project coordination]
```

Domus does not re-implement what Claude Code handles. As Claude Code's native capabilities improve, Domus should defer to them — no custom code for things Claude can handle itself. Domus fills the gaps: persistence and coordination.

---

## The House Metaphor

Domus is organised around the metaphor of a grand estate that runs itself. It has **Rooms** where different types of work happen, and **Staff** who do the work. The metaphor is load-bearing — use it when naming and designing new components.

- **Rooms** = domains of work type. Each room has a defined input and output.
- **Staff** = specialists who operate within or across rooms.
- **Mailroom** = the central routing hub. No room ever talks directly to another — all outputs pass through the Mailroom, which routes them to the correct next room.

---

## The Rooms

Every room follows a standard contract: defined inputs, defined outputs. Work flows in one direction through the system.

| Room | Input | Output | Staff |
|------|-------|--------|-------|
| **Study** | Vague ideas (human-led) | Product specs | Oracle (with human) |
| **Observatory** | Telemetry data | Ideas or bug reports | Stargazer |
| **Office** | Product specs | Work tickets | Quartermaster |
| **Workshop** | Work tickets | Merge requests (MRs) | Workers, Scribes |
| **Gatehouse** | MRs | Merged code (work exits system) | Gatekeeper |
| **Mailroom** | Outputs from all rooms | Routed to correct next room | Foreman |
| **Infirmary** | Codebase (periodic), security findings | Refactoring tickets, security bugs, improvement ideas | Doctor, Inspector, Auditor, Archivist |
| **Grounds** | System / production access | Security findings | Thief |

### Notes
- The **Grounds** is the only location outside the house. The Thief operates externally, attempting to compromise the system. Findings route back through the Mailroom to the Infirmary.
- The **Observatory** feeds the self-correcting loop (see below). Its input comes from outside Domus — a companion tracking SDK instrumented in each managed project.
- All outputs, without exception, pass through the **Mailroom**.

---

## The Staff

### Room Staff

| Role | Room | Responsibility |
|------|------|----------------|
| **Oracle** | Study | Works with the human through conversation to draw out vague ideas and co-produce concrete product specs. This is a collaborative process — the Oracle guides, but the human is essential. |
| **Stargazer** | Observatory | Analyses telemetry and error data; identifies bugs and potential feature opportunities |
| **Quartermaster** | Office | Takes product specs and decomposes them into implementable work tickets |
| **Workers** | Workshop | Implement tickets; produce MRs. Plural — many workers can operate in parallel |
| **Scribes** | Workshop | A specialisation of Worker focused on documentation tasks |
| **Gatekeeper** | Gatehouse | Reviews MRs, manages merge conflicts, ensures ordered and safe merging into the codebase |
| **Foreman** | Mailroom | Routes work between rooms; prioritises the queue |
| **Doctor** | Infirmary | Oversees system health; delegates to specialists |
| **Inspector** | Infirmary | Roams the codebase looking for quality issues, footguns, dead code, and bad patterns |
| **Auditor** | Infirmary | Takes Thief's security findings; creates bug tickets or routes vague risks to the Study |
| **Archivist** | Infirmary | Monitors documentation health across the system; ensures the system remains self-describing |
| **Thief** | Grounds | Attempts to compromise the system; reports security vulnerabilities |

### Roaming Staff (not room-bound)

| Role | Responsibility |
|------|----------------|
| **Butler** | Primary human interface. Entry point for most interactions — when you broadly know what you want. Can scope to a specific project or operate across all of them. |
| **Herald** | Manages the human feedback loop. Compiles the morning briefing on `domus connect`. Sends push notifications (email, WhatsApp) for urgent items. Escalates blockers. |
| **Chamberlain** | System configuration and maintenance. Updates config files on behalf of the user (via Butler), commits changes to git. |

---

## The Oracle

The Oracle is the entry point for ideation — the character you talk to in the Study when you have something vague and need to think it through. The Oracle's job is not to solve the problem but to help the human understand what problem they are actually trying to solve.

### Oracle Behaviour

- **Ask, don't prescribe** — the Oracle leads with questions, not suggestions. It resists jumping to solutions or implementation ideas.
- **Separate what from how** — the Oracle keeps the conversation focused on the problem space and desired outcome, not implementation details. When implementation details arise, they are treated as conceptual scaffolding to clarify the idea, not as decisions.
- **Keep the human talking** — ideas solidify through conversation. The Oracle's job is to draw out what the human already knows but hasn't articulated yet.
- **Don't rush to output** — a session ends when the idea is genuinely clear, not when it seems clear enough.
- **Produce structured output** — when the session concludes, the Oracle produces a product spec that captures the what and why, not the how.

### Oracle Output Format (Product Spec)

A product spec produced by the Study should contain:

- **Problem statement** — what problem is being solved and for whom
- **Desired outcome** — what success looks like, without prescribing implementation
- **Constraints** — known boundaries (technical, product, user experience)
- **Open questions** — anything unresolved that the Quartermaster or human will need to address before work can begin

### Note

The Oracle is always a collaboration. A product spec is never Oracle output alone — it is the result of human + Oracle working together. The Oracle guides; the human provides the raw material.

---

## The Quartermaster

The Quartermaster takes product specs and decomposes them into implementable work tickets. This is primarily a translation role — from human intent to machine-executable tasks.

### Quartermaster Behaviour

- **Recognise decisions vs. exploration** — the Quartermaster distinguishes between things that are decided (human confirms and moves on) and things still being explored (qualified language, open questions). Only decided things are captured as spec updates or tickets.
- **Update the spec automatically** — when a decision is made, the Quartermaster updates `project_spec.md` without prompting. No permission needed for bookkeeping.
- **Signals that something is decided**: human says "yes", "sounds good", "go with X", stops questioning and moves on.
- **Signals that something is still exploratory**: words like "maybe", "might", "what if", "what do you think".
- **Don't ask about bookkeeping** — spec updates, ticket creation, and decision logging are done automatically.

---

## Worker Context Assembly

A Worker is only as good as the context it receives. Domus is responsible for assembling a complete context package before any Worker session begins. The Worker itself can be simple — intelligence lives in the assembly, not the execution.

### Context Package

Before a Worker starts a task, Domus assembles:

- **Task spec** — the specific ticket: what to build, acceptance criteria, any known constraints
- **Project `claude.md`** — coding conventions, preferences, how Claude should behave in this project
- **Project `domus.md`** — project-specific Domus config: autonomy tier, project overview, relevant staff instructions
- **Codebase context** — the relevant parts of the codebase the Worker will need to read or modify
- **Prior decisions** — any architectural decisions or specs that affect this task

### Worker Execution

Workers run Claude Code in non-interactive mode. They receive their context package, execute against it, and produce output (an MR). They do not ask questions mid-task — if a task is ambiguous, that is a failure of context assembly, not a Worker failure.

Workers use **git worktrees** for isolation. Each Worker gets its own worktree under `workspace/worktrees/<project>/`, separate from the main project repo checkout.

### Claude Code Permissions

Workers must not be blocked mid-task by permission prompts. Domus pre-configures Claude Code permissions as part of context assembly — appropriate tool allowances are set before the Worker session begins. The permission profile is derived from the task type and project `domus.md`. A Worker that gets stuck on a permission prompt is a context assembly failure.

### Diagnosing Worker Failures

Unreliable Workers are almost always a context problem. When a Worker produces bad output:

1. **First suspect** — incomplete or incorrect context assembly
2. **Second suspect** — task spec too vague; needs Quartermaster refinement before resubmitting
3. **Last resort** — Worker configuration itself needs adjustment

---

## Human Experience

### Connecting
```
domus work
```
Also available as `domus connect` (alias — same command). `domus` with no arguments is also an alias.

Domus runs as a persistent background daemon — it is always on. `domus work` connects you to the running system and drops you into an interactive Butler session. Over time this gains additional behaviour: the Herald compiles a morning briefing (what was completed, what needs your attention, what is blocked) presented at the start of each session.

### Ideation Entry Point
```
domus idea
```
Drops the user into an interactive Oracle session with the Oracle persona pre-configured. Output is a product spec written to `store/<project>/specs/`.

### Initialising the Workspace
```
domus init
```
Works like `git init` — run it from inside a directory to designate it as the Domus workspace. Creates the folder structure. The workspace path is wherever you ran `domus init`.

### Adding Projects
```
domus add project <git-url>    # clones into workspace/projects/
domus add project <local-path> # registers an existing repo at its current location
```
Projects do not have to live inside the workspace. Domus records the filesystem path in `projects.md` and works with the repo wherever it lives. If a project is registered at an external path and later needs to move into the workspace, `domus move project <name>` handles that.

### Controlling Workers
```
domus workers pause
domus workers continue
```
Deferred to a later version. Relevant once a task backlog and daemon exist.

### Notifications

In v0.1, notifications are pull-based: Butler checks a worker status file at the start of each response and reports completed MRs. Push notifications (Herald via email/WhatsApp) are a later addition.

---

## Storage & Configuration

### Principles
- **Git + markdown as primary storage** — human-readable, cloneable, diffable. The same philosophy as `claude.md`.
- **SQLite as query cache only** — if query performance on markdown files ever becomes a bottleneck, SQLite is added as a cache layer, rebuilt from source on `domus init`. It is never the source of truth.
- All configuration and state that matters can be recovered by cloning the workspace repo and running `domus init`.

### Workspace Structure

```
<workspace>/                    ← wherever you ran `domus init`
  projects/                     ← repos cloned by Domus (gitignored by workspace)
    domus/
    <other-projects>/
  worktrees/                    ← git worktrees for Worker isolation (gitignored)
    domus/
      feat-some-feature/
    everycent/                  ← external project worktrees still land here
      fix-some-bug/
  store/                        ← human-readable data (tracked by workspace git)
    global/                     ← cross-project data
      ideas/                    ← raw ideas not yet through the Study
      tasks/
      decisions/
    domus/                      ← per-project data
      ideas/                    ← raw ideas (pre-Oracle inbox)
      tasks/
      specs/
      decisions/
    everycent/
      ideas/
      tasks/
      specs/
      decisions/
  .domus/                       ← internal state (gitignored)
    workers/                    ← worker status files
    logs/                       ← session and worker logs
  projects.md                   ← project registry (tracked)
  .gitignore                    ← ignores projects/, worktrees/, .domus/
```

### Two-Tier Storage

The workspace has two stores, mirroring the `claude.md` / `.claude/memory/` pattern:

- **Human store** (`store/`) — markdown meant to be read and browsed. Tasks, specs, decisions, project registry. Tracked by git.
- **Internal store** (`.domus/`) — technical state Domus needs. Worker status, process tracking, logs. Not tracked by git.

### Configuration Files
- **`domus.md`** — static config at the Domus level. Defines system-wide behaviour, autonomy settings, staff preferences.
- **`domus.md` (project-level)** — per-project config. What Domus needs to know about a specific project that cannot be inferred from the code.
- **`claude.md` / `agents.md`** — project-level conventions for Claude Code (unchanged, works as-is).

### Projects
- **Project = git repo**. Projects can live anywhere on the filesystem — Domus is not a walled garden.
- Domus records each project's filesystem path in `projects.md`.
- Cross-project work is handled by **Domus-level workers** — same worker model, but with access to all repos simultaneously.

### Git Hygiene
- The workspace root is its own git repo, tracking `store/` and `projects.md`.
- `projects/` is gitignored — each cloned repo is its own git repo and must not be nested under the workspace repo's tracking.
- `worktrees/` is gitignored — worktrees reference parent repos' git objects; the workspace repo must not interfere.
- `.domus/` is gitignored — internal/transient state.
- External project repos (registered via local path) are entirely independent — Domus touches them only through their worktrees.

---

## Tiers of Autonomy

Work and workers can operate at different autonomy levels, configurable per task type or per project:

| Tier | Behaviour |
|------|-----------|
| **Fully autonomous** | Well-defined, low-risk tasks. Execute without human involvement. Safe to run overnight. |
| **Approved, then autonomous** | Human approves the plan first; workers then execute without interruption. |
| **Supervised** | Human stays in the loop throughout execution. |

The same tiered approach applies to the spec pipeline — simple specs can flow automatically from Office → Mailroom → Workshop, while others require human review before leaving the Office as tickets.

---

## The Self-Correcting Loop

Domus can close the feedback loop between a system in production and the work queue:

1. **Tracking SDK** (companion tool, project-level) — instruments any application. Captures usage events and error logs. Likely built on OpenTelemetry / GA-style tooling.
2. **Stargazer** (Observatory) — analyses incoming telemetry. Produces:
   - Concrete bug reports → Mailroom → Office (become tickets)
   - Vague feature signals → Mailroom → Study (Oracle + human refine into specs)
3. Output flows through the normal Domus pipeline → Workers → MRs → Gatehouse → merged code → back to production

The result: a system that observes its own behaviour in production and generates its own improvement work.

---

## Failure Handling

- **Worker stuck** — Herald attempts recovery (e.g. kill and restart the session). Escalates to human if unresolvable.
- **Failure log** — all failures are logged over time. This is institutional memory for improving the system.
- **Gatekeeper rejects MR** — work re-enters the Mailroom for reassignment or human review.

---

## Development Principles

### Testing

- **TDD approach** — Workers write tests first, then implementation. This applies to Domus itself and to any project Domus manages.
- **Coverage as a priority** — cover as much as is practical. Tests serve two purposes: regression prevention and documentation. A well-tested codebase is self-describing — the tests show how the system is expected to behave.
- **Code health enables automation** — the more reliable the codebase, the more confidently Workers can operate autonomously. Flaky or untested code undermines the entire automation model.
- **Tests are part of the output** — an MR from a Worker that adds functionality without tests is incomplete. The Gatekeeper should reject it.

---

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Bun (fast Node alternative; built-in package manager, test runner, bundler)
- **Storage**: Git + markdown (workspace), per the principles above
- **Session interface**: Domus launches Claude Code (`claude` CLI) with pre-configured personas — it does not implement its own LLM conversation loop

---

## V0.1 Scope

V0.1 is the minimal working loop: human → Butler → Workers → MRs → human review.

**In scope:**
- `domus init` — designates a directory as the Domus workspace, creates folder structure
- `domus work` / `domus connect` / `domus` — interactive Butler session (Claude Code + Butler persona)
- `domus idea` — interactive Oracle session (Claude Code + Oracle persona)
- `domus add project <git-url>` — clone into workspace and register
- `domus add project <local-path>` — register existing repo at its current location
- Background Workers dispatched by Butler (Claude Code, non-interactive, git worktrees)
- Pull-based Worker notifications — Butler checks worker status at the start of each response
- Pre-configured Claude Code permissions for Workers
- Workspace store: human-readable markdown for tasks, specs, decisions
- Two managed projects: Domus itself (dogfooding) and EveryCent

**Deferred:**
- Daemon / persistent background process
- Herald push notifications (email, WhatsApp)
- `domus workers pause / continue`
- Mailroom routing, Foreman
- Observatory / Stargazer
- Infirmary / Doctor
- Formal Gatekeeper (human reviews MRs manually in v0.1)
- `domus move project`
- SQLite query cache

---

## What Domus Is Not Responsible For

- **Deployment** — merge to main triggering a deploy is a solved problem. Domus does not touch it.
- **Re-implementing Claude Code** — if Claude Code handles it natively, Domus defers.
- **LLM conversation loops** — Domus launches Claude Code with context; Claude Code handles the session.
