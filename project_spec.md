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

Workers run in non-interactive mode. They receive their context package, execute against it, and produce output (an MR). They do not ask questions mid-task — if a task is ambiguous, that is a failure of context assembly, not a Worker failure.

### Diagnosing Worker Failures

Unreliable Workers are almost always a context problem. When a Worker produces bad output:

1. **First suspect** — incomplete or incorrect context assembly
2. **Second suspect** — task spec too vague; needs Quartermaster refinement before resubmitting
3. **Last resort** — Worker configuration itself needs adjustment

---

## Human Experience

### Connecting
```
domus connect
```
Domus runs as a persistent background daemon — it is always on. `domus connect` does not start Domus; it connects you to the running system and presents a briefing: what was completed, what needs your attention, what is blocked.

### Controlling Workers
```
domus workers pause
domus workers continue
```
Workers can run autonomously while you are away (cost-configurable). These commands pause or resume worker execution without stopping the daemon.

### Notifications
Two modes:
- **Pull** — morning briefing on `domus connect`, compiled by the Herald
- **Push** — Herald sends urgent notifications (email, WhatsApp) when something cannot wait

### Entry Points
- **Butler** — primary entry for most tasks. Talk to the Butler when you know what you want, even if the details are light.
- **Oracle** — entry point for ideation. Talk to the Oracle when you have a vague idea and need to think it through. The Oracle works in the Study. Output (product specs) is always the result of human + Oracle collaboration — not the Oracle alone.

---

## Storage & Configuration

### Principles
- **Git + markdown as primary storage** — human-readable, cloneable, diffable. The same philosophy as `claude.md`.
- **SQLite as query cache only** — rebuilt from source files on `domus init`. Never the source of truth.
- All configuration and state that matters can be recovered by cloning the repo and running `domus init`.

### Configuration Files
- **`domus.md`** — static config at the Domus level. Defines system-wide behaviour, autonomy settings, staff preferences. Think `claude.md` for Domus itself.
- **`domus.md` (project-level)** — per-project config. What Domus needs to know about a specific project that cannot be inferred from the code.
- **`claude.md` / `agents.md`** — project-level conventions for Claude Code (unchanged, works as-is).

### Projects
- **Project = git repo**. Domus manages all repos on the machine.
- Projects are isolated by default. Cross-project work is handled by **Domus-level workers** — same worker model, but with access to all repos simultaneously.

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

## What Domus Is Not Responsible For

- **Deployment** — merge to main triggering a deploy is a solved problem. Domus does not touch it.
- **Re-implementing Claude Code** — if Claude Code handles it natively, Domus defers.
