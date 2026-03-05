// @ts-check

/**
 * SigUI CLI config module for load.
 * @module
 */
import { mergeWithDefaults } from "@sig-ui/theme";
import * as path from "node:path";
/** @typedef {import("@sig-ui/theme").SiguiConfig} SiguiConfig */
const CONFIG_FILENAMES = [
  "sigui.config.ts",
  "sigui.config.js",
  "sigui.config.mjs"
];
/**
 * loadConfig.
 * @param {string} cwd
 * @returns {Promise<SiguiConfig>}
 */
export async function loadConfig(cwd = process.cwd()) {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.join(cwd, filename);
    const file = Bun.file(configPath);
    if (await file.exists()) {
      const mod = await import(configPath);
      const raw = mod.default ?? mod;
      return mergeWithDefaults(raw);
    }
  }
  throw new Error("No sigui.config.{ts,js,mjs} found. Run `sigui init` to create one.");
}
export { mergeWithDefaults } from "@sig-ui/theme";
