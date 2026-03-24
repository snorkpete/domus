# Refine Idea

Mark an idea as refined — signaling it is fully understood and ready to be scoped into tasks.

## When to Use

- An ideation session has concluded and all open questions are resolved
- The user explicitly says the idea is clear, decided, or refined
- The idea's detail file has been updated with final answers to open questions

## Steps

1. **Identify the idea ID** — if not known from context, run `domus idea list` to find it.
2. **Update the detail file (if needed)** — ensure `.domus/ideas/<id>.md` reflects the refinement outcome. Open questions should be answered or resolved. Edit the file if needed.
3. **Transition the status:**
   ```bash
   domus idea status <id> refined
   ```
4. **Confirm to the user:**
   > Marked `<id>` as refined. It's now ready to be scoped into tasks whenever you're ready.
