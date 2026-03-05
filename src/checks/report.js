// @ts-check

/**
 * SigUI CLI checks module for report.
 * @module
 */
import * as log from "../utils/log.js";
const PHASE_LABELS = {
  config: "Phase 1: Config Validation",
  theme: "Phase 2: Resolved Theme Audit",
  css: "Phase 3: CSS Output Audit",
  component: "Phase 4: Component Composition Audit",
  layout: "Phase 5: Layout Quality Audit"
};
/**
 * printReport.
 * @param {ValidationReport} report
 * @returns {void}
 */
export function printReport(report) {
  const byPhase = groupByPhase(report.diagnostics);
  for (const phase of ["config", "theme", "css", "component", "layout"]) {
    const diagnostics = byPhase.get(phase);
    if (!diagnostics || diagnostics.length === 0)
      continue;
    console.log("");
    log.info(PHASE_LABELS[phase]);
    for (const d of diagnostics) {
      const specRef = d.spec ? ` [Spec ${d.spec}${d.section ? ` ${d.section}` : ""}]` : "";
      const msg = `${d.rule}: ${d.message}${specRef}`;
      if (d.severity === "error") {
        log.error(msg);
      } else if (d.severity === "warning") {
        log.warn(msg);
      } else {
        log.success(msg);
      }
      if (d.fix) {
        log.dim(`  fix: ${d.fix}`);
      }
    }
  }
  console.log("");
  if (report.errors > 0) {
    log.error(`${report.errors} error(s), ${report.warnings} warning(s), ${report.infos} info(s)`);
  } else if (report.warnings > 0) {
    log.warn(`0 errors, ${report.warnings} warning(s), ${report.infos} info(s)`);
  } else {
    log.success(`All checks passed (${report.infos} info(s))`);
  }
}
/**
 * printReportJSON.
 * @param {ValidationReport} report
 * @returns {void}
 */
export function printReportJSON(report) {
  console.log(JSON.stringify(report, null, 2));
}
function groupByPhase(diagnostics) {
  const map = new Map;
  for (const d of diagnostics) {
    const list = map.get(d.phase);
    if (list) {
      list.push(d);
    } else {
      map.set(d.phase, [d]);
    }
  }
  return map;
}
