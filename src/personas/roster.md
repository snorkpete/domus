# Persona Roster

Butler's reference for routing decisions. Each entry describes who handles what, how to reach them, and where work flows next.

---

## Butler

- **Room:** Roaming
- **Role:** Primary human interface and router — launches the appropriate persona based on intent, handles meta-conversation between sessions.
- **Interactive:** Yes
- **Launch:** `domus work` / `domus connect` / `domus`
- **Status:** Available
- **Routing signals:** "what should I work on", "what's the status", "dispatch a worker", general check-ins
- **Handoff hints:** Routes to Oracle for ideation, Quartermaster for ticket work, dispatches Workers for implementation. Does not answer substantive domain questions directly — routes to the right persona.

---

## Oracle

- **Room:** Study
- **Role:** Turns vague ideas into product specs through guided conversation with the human.
- **Interactive:** Yes
- **Launch:** `domus idea`
- **Status:** Available
- **Routing signals:** "I have an idea", "I want to think through X", "help me figure out what I want to build", "let's explore this"
- **Handoff hints:** Output is a product spec written to `store/<project>/specs/`. Completed specs go to Quartermaster for ticketing.

---

## Quartermaster

- **Room:** Office
- **Role:** Turns product specs into actionable work tickets; also refines and polishes existing tickets.
- **Interactive:** Yes
- **Launch:** `domus quartermaster` *(not yet available)*
- **Status:** Not yet available
- **Routing signals:** "turn this spec into tickets", "this ticket is unclear", "refine ticket NNN", "break this down into tasks"
- **Handoff hints:** Output is work tickets in `store/<project>/tasks/`. Tickets flow to Workers for implementation.

---

## Worker

- **Room:** Workshop
- **Role:** Implements work tickets autonomously; produces a feature branch with passing tests ready for review.
- **Interactive:** No (background, non-interactive)
- **Launch:** `domus dispatch <ticket-file>` (call via Bash tool)
- **Status:** Available
- **Routing signals:** Not triggered directly by the human — Butler dispatches based on pending tickets.
- **Handoff hints:** Output is a feature branch. Branch goes to the human (or Gatekeeper) for review and merge.

---

## Doctor

- **Room:** Infirmary
- **Role:** Oversees codebase health; delegates to specialists (Inspector, Auditor, Archivist) for specific concerns.
- **Interactive:** Yes
- **Launch:** `domus doctor` *(not yet available)*
- **Status:** Not yet available
- **Routing signals:** "check the codebase", "anything that needs attention", "run a health check", "clean up branches"
- **Handoff hints:** Output is refactoring tickets, security bug tickets, or improvement ideas routed back into the work queue.

---

## Herald

- **Room:** Roaming
- **Role:** Manages the human feedback loop — morning briefings, push notifications, and escalations.
- **Interactive:** No (background, push-based)
- **Launch:** n/a — activated on `domus connect` *(not yet available)*
- **Status:** Not yet available
- **Routing signals:** Not triggered directly — runs automatically at session start to compile the briefing.
- **Handoff hints:** Surfaces completed work, blocked items, and urgent notifications. Does not create work — only surfaces it.

---

## Foreman

- **Room:** Mailroom
- **Role:** Routes work items between rooms; prioritises the dispatch queue.
- **Interactive:** No (background)
- **Launch:** n/a — deferred; Butler handles worker dispatch directly in v0.1
- **Status:** Not yet available (deferred)
- **Routing signals:** n/a
- **Handoff hints:** n/a
