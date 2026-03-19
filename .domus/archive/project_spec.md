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

### The Domus Principle

Prefer Claude and agent features over custom code. Write the minimum code necessary, and write it so it can be replaced. Claude's capabilities will grow — pieces of Domus that exist today to fill gaps will become unnecessary as those gaps close. The codebase should be light and malleable enough that any component can be ripped out and replaced with native Claude functionality as it becomes available. Custom code for its own sake is a liability, not an asset.

---

## The House Metaphor

Domus is organised around the metaphor of a grand estate that runs itself. It has **Rooms** where different types of work happen, and **Staff** who do the work. The metaphor is load-bearing — use it when naming and designing new components.

- **Rooms** = domains of work type. Each room has a defined input and output.
- **Staff** = specialists who operate within or across rooms.
- **Mailroom** = the routing hub for work items. Work items (specs, tickets, MRs) flow through the Mailroom; session state and direct store writes bypass it.

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
- Work items (specs, tickets, MRs) route through the **Mailroom**. Session state and direct store writes (e.g. Oracle → specs, Worker → branch commits) bypass it — the Mailroom principle applies to work item routing only.

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
| **Gatekeeper** | Gatehouse | Reviews MRs, manages merge conflicts, ensures ordered and safe merging into the codebase; deletes source branch (local and remote) after a successful merge |
| **Foreman** | Mailroom | Routes work between rooms; prioritises the queue. *(Deferred — Butler handles worker dispatch directly in v0.1)* |
| **Doctor** | Infirmary | Oversees system health; delegates to specialists |
| **Inspector** | Infirmary | Roams the codebase looking for quality issues, footguns, dead code, and bad patterns |
| **Auditor** | Infirmary | Takes Thief's security findings; creates bug tickets or routes vague risks to the Study |
| **Archivist** | Infirmary | Monitors documentation health across the system; ensures the system remains self-describing |
| **Thief** | Grounds | Attempts to compromise the system; reports security vulnerabilities |

### Roaming Staff (not room-bound)

| Role | Responsibility |
|------|----------------|
| **Butler** | Primary human interface and router. Launches the appropriate persona based on the human's intent. Handles the meta-conversation between sessions: worker status, persona handoffs, what needs attention. Does not answer substantive questions directly — routes to the persona best suited for the work. In v0.1, handles worker dispatch directly (no Foreman layer). |
| **Herald** | Manages the human feedback loop. Compiles the morning briefing on `domus connect`. Sends push notifications (email, WhatsApp) for urgent items. Escalates blockers. |
| **Chamberlain** | System configuration and maintenance. Updates config files on behalf of the user (via Butler), commits changes to git. |

---

*Archived from project root on 2026-03-18. Superseded by `decisions/000-vision.md` and the role files in `.domus/reference/staff/roles/`.*
