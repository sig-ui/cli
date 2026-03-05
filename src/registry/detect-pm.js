// @ts-check

/**
 * SigUI CLI registry module for detect pm.
 * @module
 */
import * as path from "node:path";
/** @typedef {"bun" | "pnpm" | "yarn" | "npm"} PackageManager */
/**
 * detectPackageManager.
 * @param {string} cwd
 * @returns {Promise<PackageManager>}
 */
export async function detectPackageManager(cwd) {
  /** @type {readonly (readonly [string, PackageManager])[]} */
  const checks = [
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"]
  ];
  for (const [file, pm] of checks) {
    const f = Bun.file(path.join(cwd, file));
    if (await f.exists()) {
      return pm;
    }
  }
  return "npm";
}
/**
 * installCommand.
 * @param {PackageManager} pm
 * @param {string[]} packages
 * @returns {string}
 */
export function installCommand(pm, packages) {
  const pkgs = packages.join(" ");
  switch (pm) {
    case "bun":
      return `bun add ${pkgs}`;
    case "pnpm":
      return `pnpm add ${pkgs}`;
    case "yarn":
      return `yarn add ${pkgs}`;
    case "npm":
      return `npm install ${pkgs}`;
  }
}
