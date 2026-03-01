import { expect, test } from "bun:test";
import { buildButlerPrompt } from "./butler.ts";

const baseCtx = {
  workspacePath: "/workspace",
  projects: [],
  workerStatus: { running: [], mrReady: [], failed: [] },
  roster: "## Oracle\n- Role: ideation",
};

test("prompt includes workspace path", () => {
  const prompt = buildButlerPrompt(baseCtx);
  expect(prompt).toContain("/workspace");
});

test("prompt includes Butler role description", () => {
  const prompt = buildButlerPrompt(baseCtx);
  expect(prompt).toContain("Butler");
});

test("prompt lists registered projects", () => {
  const prompt = buildButlerPrompt({
    ...baseCtx,
    projects: [{ name: "myapp", path: "/code/myapp", added: "2026-02-28" }],
  });
  expect(prompt).toContain("myapp");
  expect(prompt).toContain("/code/myapp");
});

test("prompt notes when no projects are registered", () => {
  const prompt = buildButlerPrompt(baseCtx);
  expect(prompt).toContain("no projects registered");
});

test("prompt includes mr-ready workers", () => {
  const prompt = buildButlerPrompt({
    ...baseCtx,
    workerStatus: {
      running: [],
      mrReady: ["domus-006 (feat/006)"],
      failed: [],
    },
  });
  expect(prompt).toContain("MR ready");
  expect(prompt).toContain("domus-006");
});

test("prompt includes running workers", () => {
  const prompt = buildButlerPrompt({
    ...baseCtx,
    workerStatus: {
      running: ["domus-007 (feat/007)"],
      mrReady: [],
      failed: [],
    },
  });
  expect(prompt).toContain("running");
  expect(prompt).toContain("domus-007");
});

test("prompt includes failed workers", () => {
  const prompt = buildButlerPrompt({
    ...baseCtx,
    workerStatus: {
      running: [],
      mrReady: [],
      failed: ["domus-008 (feat/008)"],
    },
  });
  expect(prompt).toContain("Failed");
  expect(prompt).toContain("domus-008");
});

test("prompt notes no workers when status is empty", () => {
  const prompt = buildButlerPrompt(baseCtx);
  expect(prompt).toContain("No workers");
});

test("prompt includes roster content", () => {
  const prompt = buildButlerPrompt(baseCtx);
  expect(prompt).toContain("## Oracle");
  expect(prompt).toContain("ideation");
});
