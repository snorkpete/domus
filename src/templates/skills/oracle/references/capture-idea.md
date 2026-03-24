# Capture Idea

Save a new idea into the project's idea management system via the `domus idea` CLI.

## Before Starting

Run `domus idea list` to check for duplicate or overlapping ideas. Also run `domus task list` to check if the idea has already been promoted to a task. If a near-duplicate idea exists, ask whether to update the existing entry or create a new one. If a matching task already exists, note it to the user rather than creating a duplicate idea.

Read `.domus/tags/shared.md` and `.domus/tags/ideas.md` if they exist to get the controlled tag vocabulary. Use only those tags. If the files don't exist, use sensible freeform tags and note that a vocabulary hasn't been configured yet.

## Required Information

Collect the following. If the idea came from a conversation, infer what you can rather than asking for everything upfront. Only ask for what's genuinely unclear.

- **Title** — short, descriptive (e.g. "Auto-Categorisation on Import")
- **Summary** — 1–2 sentences covering what the idea is and why it matters
- **Tags** — pick from the project's controlled vocabulary (or freeform if none configured)
- **Full description** — the detail: the idea, why it's worth doing, open questions

## Creating the Idea

Run the CLI to create the idea and get back its ID:

```bash
domus idea add --title "<title>" --summary "<summary>" --tags "<tag1,tag2>"
```

The command prints the created ID to stdout. Capture it for the next step.

## Enriching the Detail File

After the CLI creates the basic detail file at `.domus/ideas/<id>.md`, overwrite it with the full content:

```markdown
# Idea: <Title>

**Date:** <YYYY-MM-DD>

---

## The Idea

<Core description of what the idea is>

---

## Why This Is Worth Doing

<Value proposition — product value, personal value, or both>

---

## Open Questions / Things to Explore

<Bulleted list of open questions that need answering before this can be scoped>
```

If the user provides rich content, use it directly. If the idea is thin, write what you can and make the open questions section comprehensive — it's better to have explicit unknowns than vague content.

## After Saving

Confirm to the user:
- The idea file that was created
- That the index was updated
- A one-line summary of what was captured

Do not print the full file contents back — a confirmation is enough.

## Organic Capture (No Explicit Invocation)

When an idea surfaces naturally during conversation, run this flow without waiting to be asked. Announce what you're doing briefly: "That sounds like an idea worth filing — capturing it now."
