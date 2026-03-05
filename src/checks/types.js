// @ts-check

/**
 * SigUI CLI checks module for types.
 * @module
 */
/**
 * createReport.
 * @param {Diagnostic[]} diagnostics
 * @returns {ValidationReport}
 */
export function createReport(diagnostics) {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const d of diagnostics) {
    if (d.severity === "error")
      errors++;
    else if (d.severity === "warning")
      warnings++;
    else
      infos++;
  }
  return { diagnostics, errors, warnings, infos };
}
