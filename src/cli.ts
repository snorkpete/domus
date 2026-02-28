import { version } from "../package.json";

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
    console.error("Butler session not yet implemented.");
    process.exit(1);
    break;

  case "idea":
    console.error("Oracle session not yet implemented.");
    process.exit(1);
    break;

  case "init":
    console.error("domus init not yet implemented.");
    process.exit(1);
    break;

  case "add":
    console.error("domus add not yet implemented.");
    process.exit(1);
    break;

  case "foreman":
    console.error("Foreman not yet implemented.");
    process.exit(1);
    break;

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
