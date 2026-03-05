// @ts-check

/**
 * SigUI CLI checks module for phase5.
 * @module
 */
import {
  buildTokenMap,
  parseCSSBlocks,
  auditProximityHierarchy,
  auditRhythmRegularity,
  auditLineMeasure,
  auditTouchTargets,
  auditAlignmentConsistency,
  auditSpacingClutter
} from "@sig-ui/core";
import { generateBundleCSS } from "../generators/bundle.js";
function toDiagnostics(results) {
  return results.map((r) => ({
    phase: "layout",
    rule: `layout/${r.rule}`,
    severity: r.severity,
    message: r.message + (r.selector ? ` (${r.selector})` : "") + (r.line != null ? ` [line ${r.line}]` : ""),
    spec: "03"
  }));
}
/**
 * checkProximityHierarchy.
 * @param {string} css
 * @returns {Diagnostic[]}
 */
export function checkProximityHierarchy(css) {
  const tokenMap = buildTokenMap(css);
  const blocks = parseCSSBlocks(css);
  return toDiagnostics(auditProximityHierarchy(blocks, tokenMap));
}
/**
 * checkRhythmRegularity.
 * @param {string} css
 * @returns {Diagnostic[]}
 */
export function checkRhythmRegularity(css) {
  const tokenMap = buildTokenMap(css);
  const blocks = parseCSSBlocks(css);
  return toDiagnostics(auditRhythmRegularity(blocks, tokenMap));
}
/**
 * checkLineMeasure.
 * @param {string} css
 * @returns {Diagnostic[]}
 */
export function checkLineMeasure(css) {
  const tokenMap = buildTokenMap(css);
  const blocks = parseCSSBlocks(css);
  return toDiagnostics(auditLineMeasure(blocks, tokenMap));
}
/**
 * checkTouchTargets.
 * @param {string} css
 * @returns {Diagnostic[]}
 */
export function checkTouchTargets(css) {
  const tokenMap = buildTokenMap(css);
  const blocks = parseCSSBlocks(css);
  return toDiagnostics(auditTouchTargets(blocks, tokenMap));
}
/**
 * checkAlignmentConsistency.
 * @param {string} css
 * @returns {Diagnostic[]}
 */
export function checkAlignmentConsistency(css) {
  const tokenMap = buildTokenMap(css);
  const blocks = parseCSSBlocks(css);
  return toDiagnostics(auditAlignmentConsistency(blocks, tokenMap));
}
/**
 * checkSpacingClutter.
 * @param {string} css
 * @returns {Diagnostic[]}
 */
export function checkSpacingClutter(css) {
  const tokenMap = buildTokenMap(css);
  const blocks = parseCSSBlocks(css);
  return toDiagnostics(auditSpacingClutter(blocks, tokenMap));
}
/**
 * runPhase5.
 * @param {SiguiConfig} config
 * @returns {Promise<Diagnostic[]>}
 */
export async function runPhase5(config) {
  const diagnostics = [];
  let css;
  try {
    css = await generateBundleCSS(config);
  } catch (e) {
    diagnostics.push({
      phase: "layout",
      rule: "layout/generate",
      severity: "error",
      message: `Failed to generate CSS bundle: ${e instanceof Error ? e.message : String(e)}`
    });
    return diagnostics;
  }
  const tokenMap = buildTokenMap(css);
  const blocks = parseCSSBlocks(css);
  diagnostics.push(...toDiagnostics(auditProximityHierarchy(blocks, tokenMap)));
  diagnostics.push(...toDiagnostics(auditRhythmRegularity(blocks, tokenMap)));
  diagnostics.push(...toDiagnostics(auditLineMeasure(blocks, tokenMap)));
  diagnostics.push(...toDiagnostics(auditTouchTargets(blocks, tokenMap)));
  diagnostics.push(...toDiagnostics(auditAlignmentConsistency(blocks, tokenMap)));
  diagnostics.push(...toDiagnostics(auditSpacingClutter(blocks, tokenMap)));
  return diagnostics;
}
