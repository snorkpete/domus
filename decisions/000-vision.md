# 000 — Vision

**Date:** 2026-03-15
**Status:** decided

## The problem

Every software project has two paths. The **decision path** is where humans operate: what to build, in what order, and why. The **execution path** is where the work happens: implementing, testing, committing, reviewing. Today, humans sit in both — they make decisions *and* do the execution, or at minimum stay present to shepherd it through.

This is the bottleneck. The human becomes the rate limiter on their own projects.

## What Domus does

Domus exists to remove the human from the execution path without removing them from the decision path. Humans keep full control over what gets built and when. They hand off the doing.

## Four pillars

1. **Interactive session support** — persona-driven sessions (Butler, Oracle) for thinking and deciding
2. **Concept refinement engine** — turns raw ideas into scoped specs and executable task graphs
3. **Auto execution engine** — autonomous workers execute refined tasks end-to-end
4. **Observability platform** — the human can see what's running, stalled, and queued at any time

## Context mobility

Context mobility is the substrate beneath all four pillars. Any session or worker can pick up any task or idea without explanation, because all state lives in `.domus/` and is committed alongside the code.

Without context mobility, autonomous execution requires constant hand-holding — the human has to brief every new agent instance from scratch. With it, the human can step away and come back. Workers orient themselves. Sessions resume naturally.

Context mobility is not a feature. It is the precondition for everything else.
