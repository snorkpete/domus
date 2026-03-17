# Domus

A per-project workflow tool for working effectively with AI agents over time.

---

## The idea

Every AI session starts fresh. Without structure, you spend the first ten minutes re-explaining context, re-making decisions, and re-orienting the agent to where things stand. The more ambitious the work, the worse this gets.

The insight behind Domus is simple: **keep context on disk**. If everything relevant — ideas, decisions, tasks, progress — lives in files alongside the code, any session can load exactly what it needs and continue from where the last one left off. Model sessions stop being isolated events and start being part of a bigger whole.

This is how you work effectively with agents over time.

---

## What Domus is

Domus is a `.domus/` directory committed alongside your code. It holds:

- **Ideas** — things worth exploring but not yet decided
- **Tasks** — known implementation work, with lifecycle tracking from capture to done
- **Decisions** — ADRs recording why the system is the way it is
- **Reference** — instructions loaded into Claude's context on demand

The `domus` CLI manages these. But as a human working with Domus, you rarely touch the CLI directly — you interact through **personas** and **skills** in natural language.

---

## Getting started

```bash
npm install -g domus   # or: bun add -g domus
domus init             # run at the root of your project to initialise .domus/
```

`domus init` sets up the `.domus/` directory structure, installs the default skill set, and adds the necessary configuration to `CLAUDE.md` so Claude loads the right context automatically at session start.

From there, everything is driven through natural language in your Claude Code session.

---

## How it works

### Interactive sessions

For interactive work — planning, refinement, discussion — context continuity comes from three sources:

- **Memory** — a persistent, file-based memory system that Claude writes to and reads from across sessions. Who you are, what you prefer, what decisions have been made, what's in flight.
- **Session recaps** — at the end of a session, a recap agent captures durable knowledge into memory and decision records before context resets. Nothing hard-won gets lost.
- **ADRs** — architectural decision records that explain the *why* behind key choices. When something looks non-obvious, check `decisions/` before making assumptions.

Together, these mean each new session picks up where the last one left off — without you having to re-explain anything.

> **The habit that makes it work:** Close your sessions regularly and run the session recap just before you do. Short, focused sessions beat long ones — a fresh session with only the relevant context loaded outperforms a long-running one weighed down by accumulated noise. The recap ensures nothing is lost when you clear. The system compounds over time, but only if you use it.

Domus also includes the **Doctor** persona: you and the Doctor work together to review and clean up stale tasks, outdated memory, and decisions that no longer reflect reality. Context that isn't maintained becomes noise — you and the Doctor keep it signal.

### Autonomous execution

For non-interactive work — a worker agent implementing a task in the background — continuity requires more than memory. It requires knowing not just *what* to do, but *where things stand mid-task*, including the ability to resume if something goes wrong.

This is **progress mobility**: any worker can pick up or resume any task at any step without explanation.

The mechanism is the execution log: `.domus/execution-logs/<task-id>.md`. Every significant step is appended — what was done, decisions made, output produced. If a worker is interrupted or fails mid-task, you dispatch a new worker and it reads the log to understand exactly where to resume. You get resumability for free — no manual re-briefing required.

You decide what gets built and how it gets built. The Worker handles the execution.

---

## Personas

Domus uses named personas — focused roles that Claude takes on depending on what you're doing. Each persona has a specific job and a distinct way of working.

### Taskmaster

The Taskmaster handles task refinement. His job is to take something fuzzy and make it precise enough for a worker to execute without guidance.

He starts by clarifying. If a task is vague — "I want X to happen" — he explores what X actually means: asks good questions, surfaces assumptions, nails down the goal. The Taskmaster always clarifies and never guesses — you decide how things get built. Once the goal is clear, he shifts into planning mode: reads the current code, understands the gap to the target, and produces a concrete execution plan with full context.

The output of a Taskmaster session is a task that a worker can execute autonomously, without further input.

*Coming soon*

### Worker

The Worker executes. Given a refined task, it creates a worktree, implements the work, and logs progress at each step. If a prior worker was interrupted, the Worker reads the execution log and resumes from where things left off — no context is lost between attempts.

The Worker is invoked via the `dispatch` skill — not directly.

### Doctor

The Doctor maintains the health of your Domus context. You work together interactively to surface and resolve: stale or abandoned tasks, outdated memory, decisions that no longer reflect the current system, and general consistency across the `.domus/` store. Think of it as a regular review session with a very detail-oriented collaborator.

*Coming soon*

---

## Skills

Skills are the natural language API for working with Domus. Rather than remembering commands or flags, you express your intent and the skill takes care of the rest. The phrases below are examples of how to trigger each skill — they're illustrations of intent, not exact incantations.

### Capturing work

**`capture-idea`** — file something worth exploring
> *"capture this idea"*, *"let's log that as an idea"*, *"save that thought"*

**`capture-task`** — add a known piece of work to the backlog
> *"add a task for this"*, *"log this as a task"*, *"capture that as work"*

**`update`** — update an existing task or idea; figures out what kind of update is needed
> *"update this task"*, *"add context to that idea"*, *"refine the acceptance criteria on task X"*

*Coming soon*

### Refining work

**`taskmaster`** — invoke the Taskmaster persona to refine a task from fuzzy to execution-ready
> *"let's refine this task"*, *"refine task X"*, *"taskmaster, let's nail this down"*

*Coming soon*

### Running or resuming work

**`dispatch`** — hand a refined task off to a Worker for autonomous execution, or resume a task that was interrupted
> *"dispatch task X"*, *"run this autonomously"*, *"resume task X"*, *"kick off task X"*

*Coming soon*

### Managing work

**`task-ready`** — see what's ready to work on next
> *"what should I work on?"*, *"what's next?"*, *"show me what's ready"*

**`update-task-status`** — transition a task's status
> *"mark this done"*, *"defer this task"*, *"cancel task X"*

### Session continuity

**`session-recap`** — capture durable knowledge before ending a session. Run this every time you close a session — it ensures nothing is lost when context resets.
> *"run the session recap"*, *"wrap up this session"*

**`memory-cleanup`** — review and prune stale memory entries
> *"clean up memory"*, *"run memory cleanup"*

**`doctor`** — invoke the Doctor persona to review and clean up your Domus context
> *"run the doctor"*, *"let's do a context review"*, *"doctor, check for anything stale"*

*Coming soon*

---

## Reference

The CLI is the underlying mechanism. Skills call it on your behalf — but if you're building integrations or tooling on top of Domus, here are the key commands:

```bash
domus init                              # initialise .domus/ in the current project
domus task list                         # list all tasks
domus task overview                     # pipeline view
domus task add --title "..."            # add a task
domus task status <id> <status>         # transition task status
domus task log <id> "<message>"         # append to execution log
domus idea add --title "..."            # add an idea
domus dispatch <task-id>                # trigger autonomous execution
```

Full CLI reference: `docs/cli-reference.md`

---

## The deeper why

Most AI tooling treats the agent as the unit of work: you open a session, you get something done, you close it. The context lives in the conversation window and disappears when the session ends.

This works for simple, bounded tasks. It breaks down for anything that spans multiple sessions, involves multiple phases, or requires human input at specific points.

The better model — and what Domus is built around — is to treat **the project as the unit of continuity**. The agent is a lens through which work happens, not the container that holds it. Context lives in the project. Sessions come and go.

This has a few consequences worth naming:

**Decisions should be recorded.** Not just made — recorded. If the reasoning behind a choice isn't written down, the next session will make the same choice from scratch, or worse, make a different one. ADRs are lightweight but they compound.

**Progress should be visible.** An agent mid-task is opaque unless it externalises its state. The execution log is not a debugging aid — it is what makes handoffs and resumability possible. If a worker fails mid-task, you dispatch a new one; it reads the log and picks up exactly where the previous one left off. No re-briefing. No lost work.

**Context hygiene matters.** Stale memory, abandoned tasks, and outdated decisions create noise that degrades future sessions. A system that grows without maintenance eventually becomes harder to work with than starting fresh. You and the Doctor work together to prevent this.

**The agent and you grow together.** Over time, the memory system accumulates understanding — not just of the project, but of how you prefer to work, what trade-offs you care about, what you've tried before. The agent becomes more useful not because the model changes, but because the context deepens. But this only works if you close sessions regularly and run the recap. The habit is part of the system.

**Smaller context, better work.** A long-running session accumulates noise — earlier parts of the conversation, superseded decisions, context that no longer applies. Agents perform better with focused, relevant context than with everything that's ever been said. Regular session resets, paired with the recap, mean each new session starts clean and sharp. This isn't a limitation to work around — it's the intended rhythm.

**You stay on the decision path.** You decide what gets built and how it gets built. The execution engine handles the rest — autonomously, resumably, and without you having to narrate each step.

This is how effective long-term collaboration with agents works. Every tool tries some version of this. Domus makes it explicit.

The learning continues.
