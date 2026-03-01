import { describe, expect, it, mock, spyOn } from "bun:test";

describe("checkClaudeInstalled", () => {
  it("returns true when claude is found", async () => {
    const { checkClaudeInstalled } = await import("./session.ts");
    const spy = spyOn(Bun, "spawnSync").mockReturnValue({
      exitCode: 0,
    } as ReturnType<typeof Bun.spawnSync>);
    expect(checkClaudeInstalled()).toBe(true);
    spy.mockRestore();
  });

  it("returns false when claude is not found", async () => {
    const { checkClaudeInstalled } = await import("./session.ts");
    const spy = spyOn(Bun, "spawnSync").mockReturnValue({
      exitCode: 1,
    } as ReturnType<typeof Bun.spawnSync>);
    expect(checkClaudeInstalled()).toBe(false);
    spy.mockRestore();
  });
});

describe("launchSession", () => {
  it("spawns claude with the prompt and cwd, then awaits exit", async () => {
    const { launchSession } = await import("./session.ts");
    const exited = Promise.resolve(0);
    const spawnSpy = spyOn(Bun, "spawn").mockReturnValue({
      exited,
    } as unknown as ReturnType<typeof Bun.spawn>);

    await launchSession("test prompt", "/some/path");

    expect(spawnSpy).toHaveBeenCalledWith(
      ["claude", "--append-system-prompt", "test prompt"],
      { cwd: "/some/path", stdio: ["inherit", "inherit", "inherit"] },
    );
    spawnSpy.mockRestore();
  });
});
