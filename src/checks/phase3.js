// @ts-check

/**
 * SigUI CLI checks module for phase3.
 * @module
 */
import { lintCSS, DEFAULT_CSS_BUDGET } from "@sig-ui/core";
import { generateBundleCSS } from "../generators/bundle.js";
/**
 * checkCSSLint.
 * @param {string} css
 * @param {SiguiConfig} config
 * @returns {Diagnostic[]}
 */
export function checkCSSLint(css, config) {
  const maxSpecificity = config?.performance?.css?.maxSelectorSpecificity;
  const results = lintCSS(css, { maxSpecificity });
  return results.map((r) => ({
    phase: "css",
    rule: `css-lint/${r.rule}`,
    severity: r.severity === "error" ? "error" : "warning",
    message: r.message + (r.line != null ? ` (line ${r.line})` : ""),
    spec: "10"
  }));
}
/**
 * checkBundleSize.
 * @param {string} css
 * @param {SiguiConfig} config
 * @returns {Diagnostic[]}
 */
export function checkBundleSize(css, config) {
  const diagnostics = [];
  const budget = { ...DEFAULT_CSS_BUDGET, ...config.performance?.css };
  const maxBytes = budget.maxTotalGzipped;
  const gzipped = Bun.gzipSync(new TextEncoder().encode(css));
  const gzipSize = gzipped.length;
  const gzipKB = (gzipSize / 1024).toFixed(1);
  const maxKB = (maxBytes / 1024).toFixed(0);
  if (gzipSize > maxBytes) {
    diagnostics.push({
      phase: "css",
      rule: "perf/css-bundle-size",
      severity: "error",
      message: `CSS bundle ${gzipKB}KB gzipped exceeds ${maxKB}KB budget`,
      spec: "10",
      fix: "Reduce CSS output or increase performance.css.maxTotalGzipped budget"
    });
  } else {
    const pct = (gzipSize / maxBytes * 100).toFixed(0);
    diagnostics.push({
      phase: "css",
      rule: "perf/css-bundle-size",
      severity: "info",
      message: `CSS bundle ${gzipKB}KB gzipped (${pct}% of ${maxKB}KB budget)`,
      spec: "10"
    });
  }
  return diagnostics;
}
/**
 * checkPrimitiveTokenLeak.
 * @param {string} css
 * @returns {Diagnostic[]}
 */
export function checkPrimitiveTokenLeak(css) {
  const diagnostics = [];
  const primitivePattern = /var\(--(?:brand|neutral|danger|success|warning|info)-\d+\)/g;
  const lines = css.split(`
`);
  let inRoot = false;
  let inDataTheme = false;
  let braceDepth = 0;
  let rootBraceDepth = 0;
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^:root\s*\{/.test(trimmed) || /^:root\s*,/.test(trimmed)) {
      inRoot = true;
      rootBraceDepth = braceDepth;
    }
    if (/\[data-theme/.test(trimmed) && trimmed.includes("{")) {
      inDataTheme = true;
      rootBraceDepth = braceDepth;
    }
    if (/\[data-brand/.test(trimmed) && trimmed.includes("{")) {
      inDataTheme = true;
      rootBraceDepth = braceDepth;
    }
    for (const ch of trimmed) {
      if (ch === "{")
        braceDepth++;
      if (ch === "}") {
        braceDepth--;
        if ((inRoot || inDataTheme) && braceDepth <= rootBraceDepth) {
          inRoot = false;
          inDataTheme = false;
        }
      }
    }
    if (!inRoot && !inDataTheme) {
      const matches = trimmed.match(primitivePattern);
      if (matches) {
        for (const match of matches) {
          diagnostics.push({
            phase: "css",
            rule: "tokens/primitive-leak",
            severity: "warning",
            message: `Primitive token reference ${match} in non-root context (line ${i + 1}). Use --sg-color-* semantic tokens instead.`,
            spec: "07",
            section: "§3"
          });
        }
      }
    }
  }
  return diagnostics;
}
/**
 * runPhase3.
 * @param {SiguiConfig} config
 * @returns {Promise<Diagnostic[]>}
 */
export async function runPhase3(config) {
  const diagnostics = [];
  let css;
  try {
    css = await generateBundleCSS(config);
  } catch (e) {
    diagnostics.push({
      phase: "css",
      rule: "css/generate",
      severity: "error",
      message: `Failed to generate CSS bundle: ${e instanceof Error ? e.message : String(e)}`
    });
    return diagnostics;
  }
  diagnostics.push(...checkCSSLint(css, config));
  diagnostics.push(...checkBundleSize(css, config));
  diagnostics.push(...checkPrimitiveTokenLeak(css));
  return diagnostics;
}
