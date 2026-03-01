import { version } from "../package.json";
import { runAdd } from "./commands/add.ts";
import { runIdea } from "./commands/idea.ts";
import { runInit } from "./commands/init.ts";
import { runWork } from "./commands/work.ts";

const USAGE = `
Domus — personal workflow and AI orchestration system

Usage:
  domus                     Connect to Butler session
  domus work                Connect to Butler session
  domus connect             Connect to Butler session
  domus idea                Start Oracle ideation session
  domus init                Initialise a Domus workspace
  domus add project <path>  Register a project
  domus foreman <cmd>       Manage the work queue

Options:
  --version, -v             Print version
  --help, -h                Print this help
`.trim();

const args = process.argv.slice(2);
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

    case undefined:
    case "work":
    case "connect":
      await runWork();
      break;

    case "idea":
      await runIdea(args.slice(1));
      break;

    case "init":
      await runInit(args.slice(1));
      break;

    case "add":
      await runAdd(args.slice(1));
      break;

    case "foreman":
      console.error("Foreman not yet implemented.");
      process.exit(1);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

await main();
