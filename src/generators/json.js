// @ts-check

/**
 * SigUI CLI generators module for json.
 * @module
 */
import { DEFAULT_CONFIG } from "@sig-ui/theme";
import {
  generatePalette,
  generateTypeScale,
  computeLineHeight,
  computeLetterSpacing,
  getFontWeights,
  measureTokens,
  generateSpacingScale,
  generateShadowScale,
  getDurationScale,
  getEasingCurves,
  easingToCss,
  getBorderRadiusScale,
  getBorderScale,
  getZIndexScale,
  getMinTouchTarget,
  getFocusRingConfig,
  getStateLayerConfig,
  fromOklch
} from "@sig-ui/core";
const LIGHT_BG = "#ffffff";
const SHADE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
/**
 * generateJSONTokens.
 * @param {SiguiConfig} config
 * @returns {string}
 */
export function generateJSONTokens(config) {
  const tokens = {};
  const brandPalette = generatePalette(config.brand, { background: LIGHT_BG });
  for (const stop of SHADE_STOPS) {
    const color = brandPalette.ramp[stop];
    if (color)
      tokens[`brand.${stop}`] = fromOklch(color, "hex");
  }
  const roles = { ...DEFAULT_CONFIG.roles, ...config.roles };
  for (const [role, hex] of Object.entries(roles)) {
    if (!hex)
      continue;
    const palette = generatePalette(hex, { background: LIGHT_BG });
    for (const stop of SHADE_STOPS) {
      const color = palette.ramp[stop];
      if (color)
        tokens[`${role}.${stop}`] = fromOklch(color, "hex");
    }
  }
  const typoOpts = { ...DEFAULT_CONFIG.typography, ...config.typography };
  const typeScale = generateTypeScale({ base: typoOpts.base, ratio: typoOpts.ratio });
  const scaleKeys = ["2xs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
  tokens["typography.fontFamily"] = typoOpts.fontFamily;
  tokens["typography.monoFontFamily"] = typoOpts.monoFontFamily;
  for (const step of scaleKeys) {
    tokens[`typography.text.${step}`] = `${typeScale[step]}rem`;
    tokens[`typography.leading.${step}`] = computeLineHeight(typeScale[step] * 16).computed;
    tokens[`typography.tracking.${step}`] = computeLetterSpacing(typeScale[step]);
  }
  const fontWeights = getFontWeights();
  for (const [name, weight] of Object.entries(fontWeights)) {
    tokens[`typography.weight.${name}`] = weight;
  }
  const measures = measureTokens();
  for (const [name, value] of Object.entries(measures)) {
    tokens[`typography.measure.${name}`] = value;
  }
  const spacingOpts = { ...DEFAULT_CONFIG.spacing, ...config.spacing };
  const spacingScale = generateSpacingScale({ baseUnit: spacingOpts.baseUnit });
  for (const [name, entry] of spacingScale) {
    tokens[`spacing.${name}`] = entry.rem === "0" ? "0" : entry.rem;
  }
  const radiusScale = getBorderRadiusScale({});
  for (const [name, value] of Object.entries(radiusScale)) {
    tokens[`radius.${name}`] = value;
  }
  const borderScale = getBorderScale();
  for (const [name, value] of Object.entries(borderScale)) {
    tokens[`border.${name}`] = value;
  }
  const zIndexScale = getZIndexScale();
  for (const [name, value] of Object.entries(zIndexScale)) {
    tokens[`zIndex.${name}`] = value;
  }
  const shadowScale = generateShadowScale();
  for (const shadow of shadowScale) {
    tokens[`shadow.${shadow.name}`] = shadow.css;
  }
  const durations = getDurationScale();
  for (const [name, ms] of Object.entries(durations)) {
    tokens[`motion.duration.${name}`] = ms;
  }
  const easings = getEasingCurves();
  for (const name of Object.keys(easings)) {
    tokens[`motion.easing.${name}`] = easingToCss(name);
  }
  const focus = getFocusRingConfig();
  tokens["interactive.focusColor"] = focus.color;
  tokens["interactive.focusWidth"] = `${focus.width}px`;
  tokens["interactive.focusOffset"] = `${focus.offset}px`;
  const stateLayers = getStateLayerConfig();
  tokens["interactive.hoverOpacity"] = stateLayers.hover;
  tokens["interactive.focusOpacity"] = stateLayers.focus;
  tokens["interactive.activeOpacity"] = stateLayers.active;
  tokens["interactive.touchMin"] = `${getMinTouchTarget()}px`;
  return JSON.stringify(tokens, null, 2) + `
`;
}
