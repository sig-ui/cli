// @ts-nocheck

/**
 * SigUI CLI checks module for phase2.
 * @module
 */
import {
  resolveTheme,
  getInteractionShades
} from "@sig-ui/theme";
import {
  apcaContrast,
  validateCategoricalPalette,
  isInGamut,
  nestedRadius
} from "@sig-ui/core";
import { CONTRAST_PAIRS } from "./contrast-pairs.js";
function resolveRoleColor(role, roles, palettes) {
  const mapping = roles[role];
  if (!mapping)
    return;
  return palettes[mapping.palette]?.ramp[mapping.shade];
}
/**
 * checkContrastMatrix.
 * @param {{ light: SemanticRoles; dark: SemanticRoles }} roles
 * @param {Record<string, PaletteData>} palettes
 * @returns {Diagnostic[]}
 */
export function checkContrastMatrix(roles, palettes) {
  const diagnostics = [];
  for (const mode of ["light", "dark"]) {
    const modeRoles = roles[mode];
    for (const pair of CONTRAST_PAIRS) {
      const fgColor = resolveRoleColor(pair.fg, modeRoles, palettes);
      const bgColor = resolveRoleColor(pair.bg, modeRoles, palettes);
      if (!fgColor || !bgColor) {
        continue;
      }
      const lc = Math.abs(apcaContrast(fgColor, bgColor));
      if (lc >= pair.minLc) {
        diagnostics.push({
          phase: "theme",
          rule: `contrast/${pair.fg}-on-${pair.bg}`,
          severity: "info",
          message: `[${mode}] ${pair.context}: Lc ${lc.toFixed(1)} (>=${pair.minLc} required)`,
          spec: "01",
          section: "§2.1"
        });
      } else {
        diagnostics.push({
          phase: "theme",
          rule: `contrast/${pair.fg}-on-${pair.bg}`,
          severity: "error",
          message: `[${mode}] ${pair.context}: Lc ${lc.toFixed(1)} (below ${pair.minLc} minimum)`,
          spec: "01",
          section: "§2.1",
          fix: `Adjust ${pair.fg} or ${pair.bg} palette shades to increase contrast in ${mode} mode`
        });
      }
    }
  }
  return diagnostics;
}
const INTERACTIVE_ROLES = ["primary", "secondary", "danger", "success", "warning", "info"];
/**
 * checkStateOverlayContrast.
 * @param {{ light: SemanticRoles; dark: SemanticRoles }} roles
 * @param {Record<string, PaletteData>} palettes
 * @returns {Diagnostic[]}
 */
export function checkStateOverlayContrast(roles, palettes) {
  const diagnostics = [];
  for (const mode of ["light", "dark"]) {
    const modeRoles = roles[mode];
    const textInverse = resolveRoleColor("text-inverse", modeRoles, palettes);
    if (!textInverse)
      continue;
    for (const roleName of INTERACTIVE_ROLES) {
      const roleMapping = modeRoles[roleName];
      if (!roleMapping)
        continue;
      const { hover } = getInteractionShades(roleMapping.shade, mode);
      const hoverColor = palettes[roleMapping.palette]?.ramp[hover];
      if (!hoverColor)
        continue;
      const lc = Math.abs(apcaContrast(textInverse, hoverColor));
      if (lc >= 45) {
        diagnostics.push({
          phase: "theme",
          rule: `contrast/text-inverse-on-${roleName}-hover`,
          severity: "info",
          message: `[${mode}] text-inverse on ${roleName} hover: Lc ${lc.toFixed(1)} (>=45 required)`,
          spec: "06",
          section: "§13.1"
        });
      } else {
        diagnostics.push({
          phase: "theme",
          rule: `contrast/text-inverse-on-${roleName}-hover`,
          severity: "error",
          message: `[${mode}] text-inverse on ${roleName} hover: Lc ${lc.toFixed(1)} (below 45 minimum)`,
          spec: "06",
          section: "§13.1",
          fix: `Adjust ${roleName} hover shade or text-inverse to increase contrast in ${mode} mode`
        });
      }
    }
  }
  return diagnostics;
}
const CVD_ROLES = ["danger", "success", "warning", "info"];
/**
 * checkCvdDistinguishability.
 * @param {{ light: SemanticRoles; dark: SemanticRoles }} roles
 * @param {Record<string, PaletteData>} palettes
 * @returns {Diagnostic[]}
 */
export function checkCvdDistinguishability(roles, palettes) {
  const diagnostics = [];
  for (const mode of ["light", "dark"]) {
    const modeRoles = roles[mode];
    const statusColors = [];
    const statusNames = [];
    for (const roleName of CVD_ROLES) {
      const color = resolveRoleColor(roleName, modeRoles, palettes);
      if (color) {
        statusColors.push(color);
        statusNames.push(roleName);
      }
    }
    if (statusColors.length < 2)
      continue;
    const result = validateCategoricalPalette(statusColors);
    if (result.pass) {
      diagnostics.push({
        phase: "theme",
        rule: "cvd/status-colors",
        severity: "info",
        message: `[${mode}] Status colors (${statusNames.join(", ")}) are distinguishable under CVD`,
        spec: "01",
        section: "§3"
      });
    } else {
      for (const failing of result.failingPairs) {
        diagnostics.push({
          phase: "theme",
          rule: "cvd/status-colors",
          severity: "warning",
          message: `[${mode}] ${statusNames[failing.i]} and ${statusNames[failing.j]} indistinguishable under ${failing.type} (ΔE ${failing.delta.toFixed(3)})`,
          spec: "01",
          section: "§3",
          fix: `Adjust ${statusNames[failing.i]} or ${statusNames[failing.j]} to increase CVD distinguishability`
        });
      }
    }
  }
  return diagnostics;
}
const SHADE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
/**
 * checkGamutFitness.
 * @param {Record<string, PaletteData>} palettes
 * @returns {Diagnostic[]}
 */
export function checkGamutFitness(palettes) {
  const diagnostics = [];
  let outOfGamutCount = 0;
  for (const [name, palette] of Object.entries(palettes)) {
    for (const stop of SHADE_STOPS) {
      const color = palette.ramp[stop];
      if (!color)
        continue;
      if (!isInGamut(color, "srgb")) {
        outOfGamutCount++;
      }
    }
  }
  if (outOfGamutCount > 0) {
    diagnostics.push({
      phase: "theme",
      rule: "gamut/srgb",
      severity: "info",
      message: `${outOfGamutCount} shade(s) exceed sRGB gamut (P3 fallback generated via @supports)`,
      spec: "01"
    });
  } else {
    diagnostics.push({
      phase: "theme",
      rule: "gamut/srgb",
      severity: "info",
      message: "All palette shades fit within sRGB gamut",
      spec: "01"
    });
  }
  return diagnostics;
}
/**
 * checkDensityTouchTarget.
 * @param {number} touchMin
 * @param {number} densityFactor
 * @returns {Diagnostic[]}
 */
export function checkDensityTouchTarget(touchMin, densityFactor) {
  const effective = touchMin * densityFactor;
  if (effective >= 44) {
    return [{
      phase: "theme",
      rule: "density/touch-target",
      severity: "info",
      message: `Effective touch target: ${effective.toFixed(0)}px (${touchMin}px × ${densityFactor} density)`,
      spec: "06"
    }];
  }
  return [{
    phase: "theme",
    rule: "density/touch-target",
    severity: "error",
    message: `Effective touch target too small: ${effective.toFixed(0)}px (${touchMin}px × ${densityFactor} density, minimum 44px)`,
    spec: "06",
    fix: "Increase base touch target or use a less compact density"
  }];
}
/**
 * checkNestedRadius.
 * @param {RadiusScale} radii
 * @param {number} baseUnit
 * @returns {Diagnostic[]}
 */
export function checkNestedRadius(radii, baseUnit) {
  const diagnostics = [];
  const padding = baseUnit * 2;
  for (const [name, radius] of Object.entries(radii)) {
    const inner = nestedRadius(radius, padding);
    diagnostics.push({
      phase: "theme",
      rule: "radius/nested-coherence",
      severity: "info",
      message: `Nested radius ${name}: outer ${radius}px – ${padding}px padding → inner ${inner}px`,
      spec: "04"
    });
  }
  return diagnostics;
}
/**
 * runPhase2.
 * @param {SiguiConfig} config
 * @returns {Diagnostic[]}
 */
export function runPhase2(config) {
  const diagnostics = [];
  let resolved;
  try {
    resolved = resolveTheme(config);
  } catch (e) {
    diagnostics.push({
      phase: "theme",
      rule: "theme/resolve",
      severity: "error",
      message: `Failed to resolve theme: ${e instanceof Error ? e.message : String(e)}`
    });
    return diagnostics;
  }
  diagnostics.push(...checkContrastMatrix(resolved.semanticRoles, resolved.palettes));
  diagnostics.push(...checkStateOverlayContrast(resolved.semanticRoles, resolved.palettes));
  diagnostics.push(...checkCvdDistinguishability(resolved.semanticRoles, resolved.palettes));
  diagnostics.push(...checkGamutFitness(resolved.palettes));
  diagnostics.push(...checkDensityTouchTarget(resolved.interactive.touchMin, resolved.density.factor));
  diagnostics.push(...checkNestedRadius(resolved.elevation.radii, config.spacing?.baseUnit ?? 4));
  return diagnostics;
}
