# Task: Fix temp directory leak in tickets.test.ts on test failure

**ID:** fix-temp-directory-leak-in-ticketstestts-on-test-failure
**Status:** done
**Refinement:** autonomous
**Priority:** low
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

parseTicket and updateTicketStatus test blocks use Date.now() for unique dirs with inline cleanup. If an assertion fails before cleanup, the directory leaks. Use beforeEach/afterEach or try/finally for guaranteed cleanup.

---

## Acceptance Criteria

- [ ] Each `describe` block that creates a temp dir uses a shared `let dir: string` with `beforeEach` to create it and `afterEach` to remove it via `rm(dir, { recursive: true })`
- [ ] Inline `await mkdir` / `await rm` calls removed from individual test bodies
- [ ] All existing tests still pass after the refactor

---

## Implementation Notes

File: `src/lib/tickets.test.ts` in the domus repo (`~/code/domus`).

The three `describe` blocks with async file I/O are `parseTicket (async)` and the two tests in `updateTicketStatus`. Each currently does inline setup/teardown inside the test body with a `Date.now()` dir name. If any assertion throws before `rm`, the dir leaks.

Pattern to apply (for each affected describe block):

```ts
let dir: string;
beforeEach(async () => {
  dir = join(tmpdir(), `domus-tickets-${Date.now()}`);
  await mkdir(dir, { recursive: true });
});
afterEach(async () => {
  await rm(dir, { recursive: true });
});
```

Then remove the inline `mkdir`/`rm` calls from each test and use the shared `dir`.
