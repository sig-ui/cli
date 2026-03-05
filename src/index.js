#!/usr/bin/env node
// @ts-check

/**
 * SigUI CLI index module for index.
 * @module
 */
import { init } from "./commands/init.js";
import { build } from "./commands/build.js";
import { check } from "./commands/check.js";
import { add } from "./commands/add.js";
const USAGE = `
sigui - Sigui Design System CLI

Commands:
  init   [--brand=#hex]   Create sigui.config.js and generate initial tokens
  build  [--watch]        Generate token CSS from config
  check  [path]           Validate contrast, touch targets, and token references
         [--layout]       Run Phase 5: Layout Quality Audit (spacing/rhythm/measure)
         [--full]         Run all phases including layout audit
  add    <component...>   Copy component templates into your project
         [--list]         List available components
         [--overwrite]    Replace existing files
         [--dry-run]      Preview without writing
         [--from=local]   Use local monorepo as source (dev mode)

Options:
  --help    Show this help message
  --version Show version
`;
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  switch (command) {
    case "init":
      await init(args.slice(1));
      break;
    case "build":
      await build(args.slice(1));
      break;
    case "check":
      await check(args.slice(1));
      break;
    case "add":
      await add(args.slice(1));
      break;
    case "--version":
    case "-v":
      console.log("@sig-ui/cli 0.1.0");
      break;
    case "--help":
    case "-h":
    case undefined:
      console.log(USAGE);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(USAGE);
      process.exit(1);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
