// @ts-check

/**
 * SigUI CLI commands module for check.
 * @module
 */
import * as log from "../utils/log.js";
import { loadConfig } from "../config/load.js";
import { runPhase1 } from "../checks/phase1.js";
import { runPhase2 } from "../checks/phase2.js";
import { runPhase3 } from "../checks/phase3.js";
import { runPhase4 } from "../checks/phase4.js";
import { runPhase5 } from "../checks/phase5.js";
import { createReport } from "../checks/types.js";
import { printReport, printReportJSON } from "../checks/report.js";
/**
 * check.
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export async function check(args) {
  const cwd = process.cwd();
  const full = args.includes("--full");
  const layout = args.includes("--layout");
  const json = args.includes("--json");
  try {
    const config = await loadConfig(cwd);
    if (!json) {
      log.info("Checking design token configuration...");
    }
    const diagnostics = [];
    diagnostics.push(...await runPhase1(config, cwd));
    diagnostics.push(...runPhase2(config));
    if (full) {
      diagnostics.push(...await runPhase3(config));
      diagnostics.push(...await runPhase4(config));
    }
    if (full || layout) {
      diagnostics.push(...await runPhase5(config));
    }
    const report = createReport(diagnostics);
    if (json) {
      printReportJSON(report);
    } else {
      printReport(report);
    }
    if (report.errors > 0)
      process.exit(1);
  } catch (e) {
    if (json) {
      const report = createReport([{
        phase: "config",
        rule: "config/load",
        severity: "error",
        message: String(e)
      }]);
      printReportJSON(report);
    } else {
      log.error(String(e));
    }
    process.exit(1);
  }
}
