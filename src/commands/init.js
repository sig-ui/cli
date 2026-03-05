// @ts-check

/**
 * SigUI CLI commands module for init.
 * @module
 */
import * as path from "node:path";
import * as log from "../utils/log.js";
import { buildTokens } from "./build.js";
const CONFIG_TEMPLATE = (brand) => `/** @type {import("@sig-ui/theme").SiguiConfig} */
const config = {
  brand: "${brand}",

  // --- Multi-brand theming (Spec 07 §4) ---
  // brands: {
  //   "acme-pro": {
  //     displayName: "Acme Pro",
  //     // extends: "base-brand",
  //     semanticOverrides: {
  //       "color.action.primary": "var(--brand-600)",
  //     },
  //   },
  // },

  // --- Fluid spacing tokens ---
  // fluidTokens: {
  //   enabled: true,
  //   minViewport: 320,
  //   maxViewport: 1440,
  //   fluidEasing: "ease-out", // default; set "linear" to opt out
  // },

  // --- Component templates (sigui add) ---
  // components: {
  //   dir: "src/sigui/components",
  // },

  // --- Output options ---
  // output: {
  //   dir: "src/sigui",
  //   splitFiles: false,
  // },
};

export default config;
`;
/**
 * init.
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export async function init(args) {
  const cwd = process.cwd();
  let brand = "#6366f1";
  for (const arg of args) {
    if (arg.startsWith("--brand=")) {
      brand = arg.slice("--brand=".length);
    }
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(brand)) {
    log.error(`Invalid brand color: ${brand}. Use a 6-digit hex like #6366f1`);
    process.exit(1);
  }
  const configPath = path.join(cwd, "sigui.config.js");
  const configFile = Bun.file(configPath);
  if (await configFile.exists()) {
    log.warn("sigui.config.js already exists, skipping creation");
  } else {
    await Bun.write(configPath, CONFIG_TEMPLATE(brand));
    log.success("Created sigui.config.js");
  }
  const outputDir = path.join(cwd, "src", "sigui");
  await Bun.write(path.join(outputDir, ".gitkeep"), "");
  log.success(`Created ${path.relative(cwd, outputDir)}/`);
  const cssEntryPath = path.join(cwd, "src", "app.css");
  const cssEntryFile = Bun.file(cssEntryPath);
  if (await cssEntryFile.exists()) {
    log.warn("src/app.css already exists, skipping creation");
  } else {
    await Bun.write(cssEntryPath, `/* Import sigui first - it provides the CSS reset, no need for a separate one */
@import "./sigui/sigui.css";

/* Your app styles below */
:root {
  /* Override sigui tokens here if needed */
}
`);
    log.success(`Created ${path.relative(cwd, cssEntryPath)}`);
  }
  await buildTokens(cwd);
}
