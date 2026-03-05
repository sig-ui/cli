// @ts-check

/**
 * SigUI CLI checks module for phase1.
 * @module
 */
import * as path from "node:path";
import { Glob } from "bun";
import {
  generatePalette,
  apcaContrast,
  getMinTouchTarget,
  DEFAULT_DOM_BUDGET,
  DEFAULT_CSS_BUDGET,
  DEFAULT_JS_BUDGET
} from "@sig-ui/core";
import { resolveBrandChain } from "../tokens/brand.js";
const LIGHT_BG = "#ffffff";
/**
 * checkBrandColor.
 * @param {SiguiConfig} config
 * @returns {Diagnostic[]}
 */
export function checkBrandColor(config) {
  const diagnostics = [];
  try {
    const palette = generatePalette(config.brand, { background: LIGHT_BG });
    diagnostics.push({
      phase: "config",
      rule: "brand/parseable",
      severity: "info",
      message: `Brand color ${config.brand} generates valid palette`,
      spec: "01"
    });
    const bg = palette.ramp[50];
    const fg = palette.ramp[950];
    if (bg && fg) {
      const lc = Math.abs(apcaContrast(fg, bg));
      if (lc >= 60) {
        diagnostics.push({
          phase: "config",
          rule: "contrast/brand-950-on-50",
          severity: "info",
          message: `APCA contrast 950-on-50: Lc ${lc.toFixed(1)} (>=60 required)`,
          spec: "01"
        });
      } else {
        diagnostics.push({
          phase: "config",
          rule: "contrast/brand-950-on-50",
          severity: "error",
          message: `APCA contrast 950-on-50: Lc ${lc.toFixed(1)} (below 60 minimum)`,
          spec: "01",
          fix: "Choose a brand color with more lightness range"
        });
      }
    }
  } catch {
    diagnostics.push({
      phase: "config",
      rule: "brand/parseable",
      severity: "error",
      message: `Brand color "${config.brand}" cannot be parsed`,
      spec: "01",
      fix: "Provide a valid hex color (e.g. #6366f1)"
    });
  }
  return diagnostics;
}
/**
 * checkRoleColors.
 * @param {SiguiConfig} config
 * @returns {Diagnostic[]}
 */
export function checkRoleColors(config) {
  const diagnostics = [];
  if (!config.roles)
    return diagnostics;
  for (const [role, hex] of Object.entries(config.roles)) {
    if (!hex)
      continue;
    try {
      generatePalette(hex, { background: LIGHT_BG });
      diagnostics.push({
        phase: "config",
        rule: "roles/parseable",
        severity: "info",
        message: `Role "${role}" color ${hex} is valid`
      });
    } catch {
      diagnostics.push({
        phase: "config",
        rule: "roles/parseable",
        severity: "error",
        message: `Role "${role}" color ${hex} is invalid`,
        fix: `Provide a valid hex color for the ${role} role`
      });
    }
  }
  return diagnostics;
}
/**
 * checkBrandChains.
 * @param {SiguiConfig} config
 * @returns {Diagnostic[]}
 */
export function checkBrandChains(config) {
  const diagnostics = [];
  if (!config.brands)
    return diagnostics;
  const brandConfigs = {};
  for (const [name, def] of Object.entries(config.brands)) {
    brandConfigs[name] = {
      name,
      displayName: def.displayName,
      extends: def.extends,
      primitives: def.primitives,
      semanticOverrides: def.semanticOverrides,
      componentOverrides: def.componentOverrides,
      modes: def.modes
    };
  }
  for (const name of Object.keys(config.brands)) {
    try {
      resolveBrandChain(name, brandConfigs);
      diagnostics.push({
        phase: "config",
        rule: "brands/chain",
        severity: "info",
        message: `Brand "${name}" extends chain is valid`,
        spec: "07",
        section: "§4"
      });
    } catch (e) {
      diagnostics.push({
        phase: "config",
        rule: "brands/chain",
        severity: "error",
        message: `Brand "${name}": ${e instanceof Error ? e.message : String(e)}`,
        spec: "07",
        section: "§4"
      });
    }
  }
  return diagnostics;
}
/**
 * checkBrandPrimitives.
 * @param {SiguiConfig} config
 * @returns {Diagnostic[]}
 */
export function checkBrandPrimitives(config) {
  const diagnostics = [];
  if (!config.brands)
    return diagnostics;
  for (const [name, brand] of Object.entries(config.brands)) {
    if (!brand.primitives?.color)
      continue;
    for (const [colorName, hex] of Object.entries(brand.primitives.color)) {
      try {
        generatePalette(hex, { background: LIGHT_BG });
        diagnostics.push({
          phase: "config",
          rule: "brands/primitives",
          severity: "info",
          message: `Brand "${name}" color "${colorName}" (${hex}) is valid`,
          spec: "07"
        });
      } catch {
        diagnostics.push({
          phase: "config",
          rule: "brands/primitives",
          severity: "error",
          message: `Brand "${name}" color "${colorName}" (${hex}) is invalid`,
          spec: "07",
          fix: `Provide a valid hex color for brand "${name}" color "${colorName}"`
        });
      }
    }
  }
  return diagnostics;
}
/**
 * checkPerformanceBudgets.
 * @param {SiguiConfig} config
 * @returns {Diagnostic[]}
 */
export function checkPerformanceBudgets(config) {
  const perfDom = { ...DEFAULT_DOM_BUDGET, ...config.performance?.dom };
  const perfCss = { ...DEFAULT_CSS_BUDGET, ...config.performance?.css };
  const perfJs = { ...DEFAULT_JS_BUDGET, ...config.performance?.javascript };
  return [
    {
      phase: "config",
      rule: "perf/dom",
      severity: "info",
      message: `Performance budgets: DOM depth <=${perfDom.maxNestingDepth}, nodes/component <=${perfDom.maxNodesPerComponent}`,
      spec: "10"
    },
    {
      phase: "config",
      rule: "perf/bundle",
      severity: "info",
      message: `Performance budgets: CSS <=${(perfCss.maxTotalGzipped / 1024).toFixed(0)}KB, JS <=${(perfJs.maxTotalInitialGzipped / 1024).toFixed(0)}KB gzipped`,
      spec: "10"
    }
  ];
}
/**
 * checkTouchTargets.
 * @returns {Diagnostic[]}
 */
export function checkTouchTargets() {
  const minTarget = getMinTouchTarget("coarse");
  if (minTarget >= 44) {
    return [{
      phase: "config",
      rule: "a11y/touch-target",
      severity: "info",
      message: `Touch target minimum: ${minTarget}px (coarse pointer)`,
      spec: "06"
    }];
  }
  return [{
    phase: "config",
    rule: "a11y/touch-target",
    severity: "warning",
    message: `Touch target minimum may be too small: ${minTarget}px`,
    spec: "06",
    fix: "Ensure interactive elements are at least 44px"
  }];
}
/**
 * checkCoga.
 * @param {SiguiConfig} config
 * @returns {Diagnostic[]}
 */
export function checkCoga(config) {
  const diagnostics = [];
  if (!config.cognitiveAccessibility)
    return diagnostics;
  const coga = config.cognitiveAccessibility;
  if (coga.cognitiveLoad) {
    const cl = coga.cognitiveLoad;
    diagnostics.push({
      phase: "config",
      rule: "coga/cognitive-load",
      severity: "info",
      message: `COGA cognitive load: max interactive/section <=${cl.maxInteractivePerSection}, max nav items <=${cl.maxNavItems}`,
      spec: "09"
    });
  }
  if (coga.content) {
    const ct = coga.content;
    diagnostics.push({
      phase: "config",
      rule: "coga/content",
      severity: "info",
      message: `COGA content: reading level <=${ct.maxReadingLevel}, max UI string words <=${ct.maxUIStringWords}`,
      spec: "09"
    });
  }
  if (coga.errorPrevention) {
    const ep = coga.errorPrevention;
    diagnostics.push({
      phase: "config",
      rule: "coga/error-prevention",
      severity: "info",
      message: `COGA error prevention: undo window ${ep.undoWindowSeconds}s, auto-save ${ep.autoSaveIntervalSeconds}s`,
      spec: "09"
    });
  }
  return diagnostics;
}
/**
 * checkFluidTokens.
 * @param {SiguiConfig} config
 * @returns {Diagnostic[]}
 */
export function checkFluidTokens(config) {
  if (config.fluidTokens?.enabled === false)
    return [];
  const minVp = config.fluidTokens.minViewport ?? 320;
  const maxVp = config.fluidTokens.maxViewport ?? 1440;
  if (minVp >= maxVp) {
    return [{
      phase: "config",
      rule: "fluid/viewport-range",
      severity: "error",
      message: `fluidTokens: minViewport (${minVp}) must be less than maxViewport (${maxVp})`,
      fix: "Set minViewport to a value less than maxViewport"
    }];
  }
  return [{
    phase: "config",
    rule: "fluid/viewport-range",
    severity: "info",
    message: `Fluid tokens viewport range: ${minVp}px–${maxVp}px`
  }];
}
/**
 * checkUnlayeredResets.
 * @param {SiguiConfig} config
 * @param {string} cwd
 * @returns {Promise<Diagnostic[]>}
 */
export async function checkUnlayeredResets(config, cwd) {
  const diagnostics = [];
  const outputDir = config.output?.dir ?? "src/sigui";
  const cssGlob = new Glob("**/*.css");
  for await (const file of cssGlob.scan({ cwd, onlyFiles: true })) {
    if (file.includes("node_modules") || file.startsWith(outputDir))
      continue;
    const content = await Bun.file(path.join(cwd, file)).text();
    let depth = 0;
    let inLayer = false;
    const lines = content.split(`
`);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("@layer ") && trimmed.includes("{")) {
        inLayer = true;
        depth++;
      } else if (inLayer && trimmed.includes("{")) {
        depth++;
      }
      if (inLayer && trimmed.includes("}")) {
        depth--;
        if (depth <= 0) {
          inLayer = false;
          depth = 0;
        }
      }
      if (!inLayer && /^\*[\s,]/.test(trimmed) && /(?:padding|margin)\s*:\s*0/.test(trimmed)) {
        diagnostics.push({
          phase: "config",
          rule: "css/unlayered-reset",
          severity: "warning",
          message: `Unlayered CSS reset detected in ${file}. Wrap your reset in \`@layer reset { ... }\` to avoid overriding sigui component styles.`
        });
        break;
      }
    }
  }
  return diagnostics;
}
/**
 * runPhase1.
 * @param {SiguiConfig} config
 * @param {string} cwd
 * @returns {Promise<Diagnostic[]>}
 */
export async function runPhase1(config, cwd) {
  const diagnostics = [];
  diagnostics.push(...checkBrandColor(config));
  diagnostics.push(...checkRoleColors(config));
  diagnostics.push(...checkBrandChains(config));
  diagnostics.push(...checkBrandPrimitives(config));
  diagnostics.push(...checkTouchTargets());
  diagnostics.push(...checkPerformanceBudgets(config));
  diagnostics.push(...checkCoga(config));
  diagnostics.push(...checkFluidTokens(config));
  diagnostics.push(...await checkUnlayeredResets(config, cwd));
  return diagnostics;
}
