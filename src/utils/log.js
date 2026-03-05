// @ts-check

/**
 * SigUI CLI utils module for log.
 * @module
 */
const RESET = "\x1B[0m";
const GREEN = "\x1B[32m";
const YELLOW = "\x1B[33m";
const RED = "\x1B[31m";
const CYAN = "\x1B[36m";
const DIM = "\x1B[2m";
/**
 * success.
 * @param {string} msg
 * @returns {void}
 */
export function success(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}
/**
 * warn.
 * @param {string} msg
 * @returns {void}
 */
export function warn(msg) {
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
}
/**
 * error.
 * @param {string} msg
 * @returns {void}
 */
export function error(msg) {
  console.error(`${RED}✗${RESET} ${msg}`);
}
/**
 * info.
 * @param {string} msg
 * @returns {void}
 */
export function info(msg) {
  console.log(`${CYAN}ℹ${RESET} ${msg}`);
}
/**
 * dim.
 * @param {string} msg
 * @returns {void}
 */
export function dim(msg) {
  console.log(`${DIM}${msg}${RESET}`);
}
