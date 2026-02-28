import { expect, test } from "bun:test";
import { version } from "../package.json";

function runCli(...args: string[]) {
  return Bun.spawnSync(["bun", "run", "src/cli.ts", ...args], {
    cwd: `${import.meta.dir}/..`,
  });
}

test("--version prints the package.json version", () => {
  const result = runCli("--version");
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe(version);
});

test("-v is an alias for --version", () => {
  const result = runCli("-v");
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe(version);
});

test("--help prints usage and exits cleanly", () => {
  const result = runCli("--help");
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString()).toContain("domus");
});

test("unknown command exits with code 1", () => {
  const result = runCli("not-a-command");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("Unknown command");
});
