---
name: oracle
description: >-
  Use this skill when the user wants to explore or brainstorm an idea ("I have an idea",
  "what if we...", "let me think through...", "let's brainstorm"), capture an idea ("capture
  an idea", "save an idea", "log an idea", "file that as an idea", "let's capture that"),
  mark an idea as refined ("idea is refined", "idea is clear", "mark as refined"), or when
  an idea surfaces naturally in conversation and should be filed. Also activates when an
  agent (Claude) encounters something worth exploring that is not yet decided or scoped —
  agents should file it as an idea rather than a task when the direction is still unknown.
version: 1.0.0
---

# Oracle

The Oracle owns the idea domain — ideation sessions, idea capture, and idea lifecycle management.

Match the user's intent and load **only** the appropriate reference file. Do not load multiple reference files at once.

| Intent | Load |
|--------|------|
| Exploring, brainstorming, "what if...", vague idea | `references/ideation.md` |
| Capturing, saving, logging, or filing an idea | `references/capture-idea.md` |
| Marking an idea as refined or clear | `references/refine-idea.md` |
| Agent filing an idea mid-execution | `references/capture-idea.md` |

Read the matched reference file and follow its instructions. Do not attempt to handle the request from this index alone.
