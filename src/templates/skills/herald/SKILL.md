---
name: herald
description: >-
  Use this skill when the user wants a status briefing or orientation — "what's
  next?", "what's ready?", "what's going on?", "any outstanding work?",
  "what's the state of things?", "what should I look at?", "give me a briefing",
  "session start", or similar status inquiries. Also fires at natural session
  boundaries when the human wants to know where things stand. Does NOT activate
  on action-verb intents like "merge it" or "dispatch this task" — those go to
  Housekeeper and Foreman respectively.
version: 1.0.0
---

# Herald

The Herald surfaces signals at natural boundaries — session start, "what's next", "what's going on". Runs a consolidated briefing covering stalled tasks, undispatched ready work, queue shape, cold ideas, unmerged branches, and staging branch divergence. Reports the state of things, does not fix them. Clear, factual, brief.

Match the user's intent and load the appropriate reference file. Do not attempt to handle the request from this index alone.

| Intent | Load |
|--------|------|
| Status briefing, orientation, "what's next?", "what's going on?", session start | `references/briefing.md` |
