import { expect, test } from "bun:test";
import { buildOraclePrompt } from "./oracle.ts";

const baseCtx = {
  workspacePath: "/workspace",
  projects: [],
};

test("prompt includes Oracle role description", () => {
  const prompt = buildOraclePrompt(baseCtx);
  expect(prompt).toContain("Oracle");
});

test("prompt includes workspace path", () => {
  const prompt = buildOraclePrompt(baseCtx);
  expect(prompt).toContain("/workspace");
});

test("prompt encodes ask-don't-prescribe rule", () => {
  const prompt = buildOraclePrompt(baseCtx);
  expect(prompt.toLowerCase()).toContain("question");
});

test("prompt encodes separate-what-from-how rule", () => {
  const prompt = buildOraclePrompt(baseCtx);
  expect(prompt.toLowerCase()).toContain("how");
  expect(prompt.toLowerCase()).toContain("what");
});

test("prompt encodes keep-the-human-talking rule", () => {
  const prompt = buildOraclePrompt(baseCtx);
  expect(prompt.toLowerCase()).toContain("talking");
});

test("prompt encodes don't-rush-to-output rule", () => {
  const prompt = buildOraclePrompt(baseCtx);
  expect(prompt.toLowerCase()).toContain("rush");
});

test("prompt includes spec output instructions", () => {
  const prompt = buildOraclePrompt(baseCtx);
  expect(prompt).toContain("store/");
  expect(prompt).toContain("specs/");
});

test("prompt includes spec sections", () => {
  const prompt = buildOraclePrompt(baseCtx);
  expect(prompt).toContain("Problem Statement");
  expect(prompt).toContain("Desired Outcome");
  expect(prompt).toContain("Constraints");
  expect(prompt).toContain("Open Questions");
});

test("prompt lists registered projects", () => {
  const prompt = buildOraclePrompt({
    ...baseCtx,
    projects: [{ name: "myapp", path: "/code/myapp", added: "2026-02-28" }],
  });
  expect(prompt).toContain("myapp");
  expect(prompt).toContain("/code/myapp");
});

test("prompt notes when no projects are registered", () => {
  const prompt = buildOraclePrompt(baseCtx);
  expect(prompt).toContain("no projects registered");
});

test("prompt instructs Oracle to confirm slug before writing", () => {
  const prompt = buildOraclePrompt(baseCtx);
  expect(prompt.toLowerCase()).toContain("confirm");
});
