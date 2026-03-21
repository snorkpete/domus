#!/usr/bin/env bun
import { version } from "../package.json";
import { runConfig } from "./commands/config.ts";
import { runDispatch } from "./commands/dispatch.ts";
import { runIdea } from "./commands/idea.ts";
import { runInit } from "./commands/init.ts";
import { runTask } from "./commands/task/index.ts";
import { runUpdate } from "./commands/update.ts";
import { stripRoot } from "./lib/root.ts";

export { stripRoot };

const USAGE = `
Domus — per-project workflow tool

Usage:
  domus idea                     Manage ideas (domus idea --help)
  domus init                     Initialise a .domus/ directory
  domus update                   Update an existing .domus/ directory and migrate schemas
  domus config <subcommand>      Manage project configuration (domus config --help)
  domus dispatch <task-id>       Dispatch a worker for a task
  domus task <subcommand>        Manage project tasks

Global Options:
  --root <path>             Override project root (target a specific project's .domus/)
  --version, -v             Print version
  --help, -h                Print this help
`.trim();

const { root, rest: args } = stripRoot(process.argv.slice(2));
if (root) {
  process.env.DOMUS_ROOT = root;
}
const command = args[0];

async function main() {
  switch (command) {
    case "--version":
    case "-v":
      console.log(version);
      break;

    case "--help":
    case "-h":
      console.log(USAGE);
      break;

    case "idea":
      await runIdea(args.slice(1));
      break;

    case "init":
      await runInit(args.slice(1));
      break;

    case "update":
      await runUpdate(args.slice(1));
      break;

    case "config":
      await runConfig(args.slice(1));
      break;

    case "dispatch":
      await runDispatch(args.slice(1));
      break;

    case "task":
      await runTask(args.slice(1));
      break;

    default:
      console.error(`Unknown command: ${command ?? "(none)"}`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
