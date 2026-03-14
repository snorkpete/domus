import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseTicket,
  parseTicketContent,
  updateTicketStatus,
} from "./tickets.ts";

const SAMPLE_TICKET = `# 006 — Worker Dispatch

**Status:** pending
**Priority:** high
**Project:** domus
**Branch:** feat/006-worker-dispatch

## Context

Some context here.
`;

describe("parseTicketContent", () => {
  test("parses number and title from heading", () => {
    const t = parseTicketContent("/fake/006-worker-dispatch.md", SAMPLE_TICKET);
    expect(t.number).toBe("006");
    expect(t.title).toBe("Worker Dispatch");
  });

  test("parses status", () => {
    const t = parseTicketContent("/fake/006-worker-dispatch.md", SAMPLE_TICKET);
    expect(t.status).toBe("pending");
  });

  test("parses project", () => {
    const t = parseTicketContent("/fake/006-worker-dispatch.md", SAMPLE_TICKET);
    expect(t.project).toBe("domus");
  });

  test("parses branch", () => {
    const t = parseTicketContent("/fake/006-worker-dispatch.md", SAMPLE_TICKET);
    expect(t.branch).toBe("feat/006-worker-dispatch");
  });

  test("falls back to filename when no heading", () => {
    const t = parseTicketContent(
      "/fake/007-status-tracking.md",
      "No heading here.",
    );
    expect(t.number).toBe("007");
    expect(t.title).toBe("status tracking");
  });

  test("returns unknown for missing fields", () => {
    const t = parseTicketContent(
      "/fake/nofields.md",
      "# 001 — Title\n\nNo fields.",
    );
    expect(t.status).toBe("unknown");
    expect(t.project).toBe("unknown");
  });

  test("preserves filePath", () => {
    const t = parseTicketContent("/some/path/006.md", SAMPLE_TICKET);
    expect(t.filePath).toBe("/some/path/006.md");
  });
});

describe("parseTicket (async)", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(tmpdir(), `domus-tickets-${Date.now()}`);
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("reads file and parses it", async () => {
    const filePath = join(dir, "006-worker-dispatch.md");
    await writeFile(filePath, SAMPLE_TICKET, "utf-8");

    const t = await parseTicket(filePath);
    expect(t.number).toBe("006");
    expect(t.status).toBe("pending");
  });
});

describe("updateTicketStatus", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(tmpdir(), `domus-tickets-${Date.now()}`);
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("updates only the Status line", async () => {
    const filePath = join(dir, "006.md");
    await writeFile(filePath, SAMPLE_TICKET, "utf-8");

    await updateTicketStatus(filePath, "in-progress");

    const updated = await Bun.file(filePath).text();
    expect(updated).toContain("**Status:** in-progress");
    expect(updated).toContain("**Priority:** high"); // other fields unchanged
    expect(updated).toContain("**Branch:** feat/006-worker-dispatch");
  });

  test("only replaces the first Status line", async () => {
    const content =
      "# 001 — Test\n\n**Status:** pending\n\nSome text with **Status:** draft inside.\n";
    const filePath = join(dir, "001.md");
    await writeFile(filePath, content, "utf-8");

    await updateTicketStatus(filePath, "done");

    const updated = await Bun.file(filePath).text();
    const lines = updated.split("\n");
    const statusLines = lines.filter((l) => l.startsWith("**Status:**"));
    expect(statusLines).toHaveLength(1);
    expect(statusLines[0]).toBe("**Status:** done");
  });
});
