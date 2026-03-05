// @ts-check

/**
 * SigUI CLI generators module for split css.
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
  fluidTypeScale,
  generateSpacingScale,
  fluidSpacingScale,
  generateShadowScale,
  getDurationScale,
  getEasingCurves,
  easingToCss,
  getFocusRingConfig,
  getStateLayerConfig,
  getBorderRadiusScale,
  getBorderScale,
  getZIndexScale,
  getMinTouchTarget,
  fromOklch,
  toOklch,
  clamp,
  normalizeHue,
  deriveSurfaceScale,
  generateI18nCSS
} from "@sig-ui/core";
const LIGHT_BG = "#ffffff";
const SHADE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const SCALE_KEYS = ["2xs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
function makePalette(hex) {
  const result = generatePalette(hex, { background: LIGHT_BG });
  return { ramp: result.ramp };
}
/**
 * generateSplitCSS.
 * @param {SiguiConfig} config
 * @returns {SplitCSSResult}
 */
export function generateSplitCSS(config) {
  return {
    primitives: generatePrimitives(config),
    semanticLight: generateSemanticLight(config),
    semanticDark: generateSemanticDark(config),
    brands: generateBrandFiles(config),
    densities: generateDensityFiles(),
    components: generateComponents(),
    highContrast: generateHighContrast(),
    reducedTransparency: generateReducedTransparency(config),
    i18n: generateI18nFile(config),
    all: generateAllManifest(config)
  };
}
function generatePrimitives(config) {
  const lines = [];
  lines.push("@layer sigui.tokens {");
  lines.push(":root {");
  const brandPalette = makePalette(config.brand);
  lines.push("  /* Brand palette */");
  for (const stop of SHADE_STOPS) {
    const color = brandPalette.ramp[stop];
    if (!color)
      continue;
    lines.push(`  --brand-${stop}: ${fromOklch(color, "hex")};`);
  }
  lines.push("");
  if (config.colors) {
    for (const [name, hex] of Object.entries(config.colors)) {
      const palette = makePalette(hex);
      lines.push(`  /* ${name} palette */`);
      for (const stop of SHADE_STOPS) {
        const color = palette.ramp[stop];
        if (!color)
          continue;
        lines.push(`  --${name}-${stop}: ${fromOklch(color, "hex")};`);
      }
      lines.push("");
    }
  }
  const roles = { ...DEFAULT_CONFIG.roles, ...config.roles };
  for (const [role, hex] of Object.entries(roles)) {
    if (!hex)
      continue;
    const palette = makePalette(hex);
    lines.push(`  /* ${role} palette */`);
    for (const stop of SHADE_STOPS) {
      const color = palette.ramp[stop];
      if (!color)
        continue;
      lines.push(`  --${role}-${stop}: ${fromOklch(color, "hex")};`);
    }
    lines.push("");
  }
  const typoOpts = { ...DEFAULT_CONFIG.typography, ...config.typography };
  const typeScale = generateTypeScale({ base: typoOpts.base, ratio: typoOpts.ratio });
  const useFluidType = config.typography?.fluid === true;
  lines.push("  /* Typography */");
  lines.push(`  --sg-font-family: ${typoOpts.fontFamily};`);
  lines.push(`  --sg-font-mono: ${typoOpts.monoFontFamily};`);
  if (typoOpts.displayFontFamily) {
    lines.push(`  --sg-font-display: ${typoOpts.displayFontFamily};`);
  }
  if (useFluidType) {
    const fluidScale = fluidTypeScale({ base: typoOpts.base ?? 16, ratio: typoOpts.ratio ?? 1.2 });
    for (const step of SCALE_KEYS) {
      const fluid = fluidScale[step];
      lines.push(`  --sg-text-${step}: ${fluid ? fluid.clamp : `${typeScale[step]}rem`};`);
      lines.push(`  --sg-leading-${step}: ${computeLineHeight(typeScale[step] * 16).computed};`);
    }
  } else {
    for (const step of SCALE_KEYS) {
      lines.push(`  --sg-text-${step}: ${typeScale[step]}rem;`);
      lines.push(`  --sg-leading-${step}: ${computeLineHeight(typeScale[step] * 16).computed};`);
    }
  }
  lines.push("");
  lines.push("  /* Letter spacing */");
  for (const step of SCALE_KEYS) {
    lines.push(`  --sg-tracking-${step}: ${computeLetterSpacing(typeScale[step])};`);
  }
  lines.push("");
  lines.push("  /* Semantic letter-spacing (for uppercase/label text) */");
  lines.push("  --sg-tracking-wide: 0.03em;");
  lines.push("  --sg-tracking-caps: 0.06em;");
  lines.push("");
  const fontWeights = getFontWeights();
  lines.push("  /* Font weights */");
  for (const [name, weight] of Object.entries(fontWeights)) {
    lines.push(`  --sg-weight-${name}: ${weight};`);
  }
  lines.push("");
  const measures = measureTokens();
  lines.push("  /* Measure */");
  for (const [name, value] of Object.entries(measures)) {
    lines.push(`  --sg-measure-${name}: ${value};`);
  }
  lines.push("");
  lines.push("  /* Semantic line-height (font-size independent) */");
  lines.push("  --sg-leading-none: 1;");
  lines.push("  --sg-leading-tight: 1.2;");
  lines.push("  --sg-leading-snug: 1.3;");
  lines.push("  --sg-leading-normal: 1.4;");
  lines.push("  --sg-leading-relaxed: 1.5;");
  lines.push("  --sg-leading-loose: 1.6;");
  lines.push("");
  const spacingOpts = { ...DEFAULT_CONFIG.spacing, ...config.spacing };
  const useFluidSpacing = config.fluidTokens?.enabled !== false;
  lines.push("  /* Spacing */");
  const baseUnit = spacingOpts.baseUnit ?? 4;
  const baseUnitRem = parseFloat((baseUnit / 16).toFixed(4));
  lines.push(`  --sg-base-unit: ${baseUnitRem}rem;`);
  if (useFluidSpacing) {
    const fluidOpts = { ...DEFAULT_CONFIG.fluidTokens, ...config.fluidTokens };
    const fluidScale = fluidSpacingScale({
      baseUnit: spacingOpts.baseUnit,
      includeExtended: spacingOpts.includeExtended,
      minVw: (fluidOpts.minViewport ?? 320) / 16,
      maxVw: (fluidOpts.maxViewport ?? 1440) / 16,
      fluidEasing: fluidOpts.fluidEasing ?? "ease-out"
    });
    for (const [name, value] of fluidScale) {
      const cssName = name.replace(/\./g, "-");
      lines.push(`  --sg-space-${cssName}: ${value};`);
    }
  } else {
    const spacingScale = generateSpacingScale({
      baseUnit: spacingOpts.baseUnit,
      includeExtended: spacingOpts.includeExtended
    });
    for (const [name] of spacingScale) {
      const cssName = name.replace(/\./g, "-");
      if (name === "0") {
        lines.push(`  --sg-space-${cssName}: 0;`);
      } else if (name === "px") {
        lines.push(`  --sg-space-${cssName}: 1px;`);
      } else {
        lines.push(`  --sg-space-${cssName}: calc(${name} * var(--sg-base-unit));`);
      }
    }
  }
  lines.push("");
  const shadowScale = generateShadowScale();
  lines.push("  /* Elevation */");
  for (const shadow of shadowScale) {
    lines.push(`  --sg-shadow-${shadow.name}: ${shadow.css};`);
  }
  lines.push("");
  const radiusScale = getBorderRadiusScale();
  lines.push("  /* Border radius */");
  for (const [name, value] of Object.entries(radiusScale)) {
    lines.push(`  --sg-radius-${name}: ${value === 0 ? "0" : `${value}px`};`);
  }
  lines.push("");
  const borderScale = getBorderScale();
  lines.push("  /* Border width */");
  for (const [name, value] of Object.entries(borderScale)) {
    lines.push(`  --sg-border-${name}: ${value === 0 ? "0" : `${value}px`};`);
  }
  lines.push("");
  const zIndexScale = getZIndexScale();
  lines.push("  /* Z-index */");
  for (const [name, value] of Object.entries(zIndexScale)) {
    lines.push(`  --sg-z-${name}: ${value};`);
  }
  lines.push("");
  const durations = getDurationScale();
  const easings = getEasingCurves();
  lines.push("  /* Motion */");
  for (const [name, ms] of Object.entries(durations)) {
    lines.push(`  --sg-duration-${name}: ${ms}ms;`);
  }
  lines.push("");
  for (const name of Object.keys(easings)) {
    lines.push(`  --sg-ease-${name}: ${easingToCss(name)};`);
  }
  lines.push("");
  const focus = getFocusRingConfig();
  const stateLayers = getStateLayerConfig();
  lines.push("  /* Interactive */");
  lines.push(`  --sg-focus-color: ${focus.color};`);
  lines.push(`  --sg-focus-width: ${focus.width}px;`);
  lines.push(`  --sg-focus-offset: ${focus.offset}px;`);
  lines.push("  --sg-disabled-opacity: 0.38;");
  lines.push(`  --sg-state-hover-opacity: ${stateLayers.hover};`);
  lines.push(`  --sg-state-focus-opacity: ${stateLayers.focus};`);
  lines.push(`  --sg-state-active-opacity: ${stateLayers.active};`);
  lines.push("");
  const touchMin = getMinTouchTarget();
  lines.push(`  --sg-touch-min: ${touchMin}px;`);
  lines.push("  --sg-touch-pointer-min: 24px;");
  lines.push("  --sg-density: 1;");
  lines.push("");
  const brandOklch = toOklch(config.brand);
  const tintStrength = config.tintStrength ?? 0.1;
  const lightSurfaces = deriveSurfaceScale(brandOklch.h, brandOklch.c, "light", tintStrength);
  lines.push("  /* Surface palette */");
  lines.push(`  --surface-bg-lowest: ${lightSurfaces["bg.lowest"]};`);
  lines.push(`  --surface-bg: ${lightSurfaces["bg.primary"]};`);
  lines.push(`  --surface-bg-low: ${lightSurfaces["bg.low"]};`);
  lines.push(`  --surface-bg-secondary: ${lightSurfaces["bg.secondary"]};`);
  lines.push(`  --surface-bg-tertiary: ${lightSurfaces["bg.tertiary"]};`);
  lines.push(`  --surface-bg-highest: ${lightSurfaces["bg.highest"]};`);
  lines.push(`  --surface-border-default: ${lightSurfaces["border.default"]};`);
  lines.push(`  --surface-border-strong: ${lightSurfaces["border.strong"]};`);
  lines.push("}");
  lines.push("} /* @layer sigui.tokens */");
  lines.push("");
  return lines.join(`
`);
}
function generateSemanticLight(config) {
  const lines = [];
  lines.push("@layer sigui.tokens {");
  lines.push(":root {");
  lines.push("  --sg-color-primary: var(--brand-500);");
  lines.push("  --sg-color-primary-hover: var(--brand-600);");
  lines.push("  --sg-color-primary-active: var(--brand-700);");
  lines.push("  --sg-color-primary-subtle: var(--brand-100);");
  lines.push("  --sg-color-secondary: var(--secondary-500, var(--brand-100));");
  lines.push("  --sg-color-secondary-hover: var(--secondary-600, var(--brand-200));");
  lines.push("  --sg-color-secondary-active: var(--secondary-700, var(--brand-300));");
  lines.push("  --sg-color-secondary-subtle: var(--secondary-100, var(--brand-50));");
  lines.push("  --sg-color-tertiary: var(--tertiary-500, var(--brand-500));");
  lines.push("  --sg-color-tertiary-hover: var(--tertiary-600, var(--brand-600));");
  lines.push("  --sg-color-tertiary-active: var(--tertiary-700, var(--brand-700));");
  lines.push("  --sg-color-tertiary-subtle: var(--tertiary-100, var(--brand-100));");
  lines.push("  --sg-color-accent: var(--accent-500, var(--brand-500));");
  lines.push("  --sg-color-accent-hover: var(--accent-600, var(--brand-600));");
  lines.push("  --sg-color-accent-active: var(--accent-700, var(--brand-700));");
  lines.push("  --sg-color-accent-subtle: var(--accent-100, var(--brand-100));");
  lines.push("  --sg-color-highlight: var(--accent-200, var(--brand-200));");
  lines.push("  --sg-color-highlight-hover: var(--accent-300, var(--brand-300));");
  lines.push("  --sg-color-highlight-active: var(--accent-400, var(--brand-400));");
  lines.push("  --sg-color-highlight-subtle: var(--accent-100, var(--brand-100));");
  lines.push("");
  lines.push("  --sg-color-text: var(--neutral-800, var(--brand-950));");
  lines.push("  --sg-color-text-secondary: var(--neutral-600, var(--brand-700));");
  lines.push("  --sg-color-text-muted: var(--neutral-400, var(--brand-500));");
  lines.push("  --sg-color-text-inverse: var(--brand-50);");
  lines.push("  --sg-color-title: var(--neutral-900, var(--brand-950));");
  lines.push("  --sg-color-subtitle: var(--neutral-700, var(--brand-800));");
  lines.push("  --sg-color-link: var(--brand-600);");
  lines.push("  --sg-color-link-visited: var(--brand-800);");
  lines.push("  --sg-color-emphasis: var(--brand-700);");
  lines.push("");
  lines.push("  --sg-bg: var(--surface-bg);");
  lines.push("  --sg-surface-container-lowest: var(--surface-bg-lowest);");
  lines.push("  --sg-surface-container-low: var(--surface-bg-low);");
  lines.push("  --sg-surface-container: var(--surface-bg-secondary);");
  lines.push("  --sg-surface-container-high: var(--surface-bg-tertiary);");
  lines.push("  --sg-surface-container-highest: var(--surface-bg-highest);");
  lines.push("  --sg-color-border: var(--surface-border-default);");
  lines.push("  --sg-color-border-light: var(--surface-border-strong);");
  lines.push("  --sg-color-border-focus: var(--brand-500);");
  lines.push("  --sg-color-shadow: var(--neutral-900, var(--brand-950));");
  lines.push("");
  lines.push("  --sg-color-code-text: var(--neutral-800);");
  lines.push("  --sg-color-code-bg: var(--neutral-200, var(--brand-100));");
  lines.push("");
  lines.push("  --sg-color-success: var(--success-500);");
  lines.push("  --sg-color-success-hover: var(--success-600);");
  lines.push("  --sg-color-success-active: var(--success-700);");
  lines.push("  --sg-color-success-subtle: var(--success-100);");
  lines.push("  --sg-color-warning: var(--warning-500);");
  lines.push("  --sg-color-warning-hover: var(--warning-600);");
  lines.push("  --sg-color-warning-active: var(--warning-700);");
  lines.push("  --sg-color-warning-subtle: var(--warning-100);");
  lines.push("  --sg-color-danger: var(--danger-500);");
  lines.push("  --sg-color-danger-hover: var(--danger-600);");
  lines.push("  --sg-color-danger-active: var(--danger-700);");
  lines.push("  --sg-color-danger-subtle: var(--danger-100);");
  lines.push("  --sg-color-info: var(--info-500);");
  lines.push("  --sg-color-info-hover: var(--info-600);");
  lines.push("  --sg-color-info-active: var(--info-700);");
  lines.push("  --sg-color-info-subtle: var(--info-100);");
  lines.push("");
  {
    const pOklch = toOklch(config.brand);
    const dataL = 0.55;
    const dataC = clamp(pOklch.c, 0.08, 0.15);
    for (let i = 0;i < 12; i++) {
      const hue = normalizeHue(pOklch.h + i * 30);
      const hex = fromOklch({ l: dataL, c: dataC, h: hue, alpha: 1 }, "hex");
      lines.push(`  --sg-color-data-${i + 1}: ${hex};`);
    }
  }
  lines.push("");
  lines.push("  --sg-gap-micro: var(--sg-space-0-5);");
  lines.push("  --sg-gap-tight: var(--sg-space-1);");
  lines.push("  --sg-gap-related: var(--sg-space-2);");
  lines.push("  --sg-gap-grouped: var(--sg-space-4);");
  lines.push("  --sg-gap-separated: var(--sg-space-8);");
  lines.push("  --sg-gap-distinct: var(--sg-space-16);");
  lines.push("}");
  lines.push("} /* @layer sigui.tokens */");
  lines.push("");
  return lines.join(`
`);
}
function generateSemanticDark(config) {
  const brandOklch = toOklch(config.brand);
  const tintStrength = config.tintStrength ?? 0.1;
  const darkSurfaces = deriveSurfaceScale(brandOklch.h, brandOklch.c, "dark", tintStrength);
  const props = [];
  props.push(`--surface-bg-lowest: ${darkSurfaces["bg.lowest"]};`);
  props.push(`--surface-bg: ${darkSurfaces["bg.primary"]};`);
  props.push(`--surface-bg-low: ${darkSurfaces["bg.low"]};`);
  props.push(`--surface-bg-secondary: ${darkSurfaces["bg.secondary"]};`);
  props.push(`--surface-bg-tertiary: ${darkSurfaces["bg.tertiary"]};`);
  props.push(`--surface-bg-highest: ${darkSurfaces["bg.highest"]};`);
  props.push(`--surface-border-default: ${darkSurfaces["border.default"]};`);
  props.push(`--surface-border-strong: ${darkSurfaces["border.strong"]};`);
  props.push("--sg-color-primary: var(--brand-400);");
  props.push("--sg-color-primary-hover: var(--brand-300);");
  props.push("--sg-color-primary-active: var(--brand-200);");
  props.push("--sg-color-primary-subtle: var(--brand-900);");
  props.push("--sg-color-secondary: var(--secondary-400, var(--brand-900));");
  props.push("--sg-color-secondary-hover: var(--secondary-300, var(--brand-800));");
  props.push("--sg-color-secondary-active: var(--secondary-200, var(--brand-700));");
  props.push("--sg-color-secondary-subtle: var(--secondary-900, var(--brand-950));");
  props.push("--sg-color-tertiary: var(--tertiary-400, var(--brand-400));");
  props.push("--sg-color-tertiary-hover: var(--tertiary-300, var(--brand-300));");
  props.push("--sg-color-tertiary-active: var(--tertiary-200, var(--brand-200));");
  props.push("--sg-color-tertiary-subtle: var(--tertiary-900, var(--brand-900));");
  props.push("--sg-color-accent: var(--accent-400, var(--brand-400));");
  props.push("--sg-color-accent-hover: var(--accent-300, var(--brand-300));");
  props.push("--sg-color-accent-active: var(--accent-200, var(--brand-200));");
  props.push("--sg-color-accent-subtle: var(--accent-900, var(--brand-900));");
  props.push("--sg-color-highlight: var(--accent-200, var(--brand-200));");
  props.push("--sg-color-highlight-hover: var(--accent-300, var(--brand-300));");
  props.push("--sg-color-highlight-active: var(--accent-400, var(--brand-400));");
  props.push("--sg-color-highlight-subtle: var(--accent-900, var(--brand-900));");
  props.push("");
  props.push("--sg-color-text: var(--neutral-200, var(--brand-50));");
  props.push("--sg-color-text-secondary: var(--neutral-400, var(--brand-300));");
  props.push("--sg-color-text-muted: var(--neutral-600, var(--brand-500));");
  props.push("--sg-color-text-inverse: var(--brand-950);");
  props.push("--sg-color-title: var(--neutral-100, var(--brand-50));");
  props.push("--sg-color-subtitle: var(--neutral-300, var(--brand-200));");
  props.push("--sg-color-link: var(--brand-400);");
  props.push("--sg-color-link-visited: var(--brand-200);");
  props.push("--sg-color-emphasis: var(--brand-300);");
  props.push("");
  props.push("--sg-color-border-focus: var(--brand-400);");
  props.push("--sg-color-shadow: var(--neutral-950, var(--brand-950));");
  props.push("--sg-color-code-text: var(--neutral-200);");
  props.push("--sg-color-code-bg: var(--neutral-800, var(--brand-900));");
  props.push("");
  props.push("--sg-color-success: var(--success-400);");
  props.push("--sg-color-success-hover: var(--success-300);");
  props.push("--sg-color-success-active: var(--success-200);");
  props.push("--sg-color-success-subtle: var(--success-900);");
  props.push("--sg-color-warning: var(--warning-400);");
  props.push("--sg-color-warning-hover: var(--warning-300);");
  props.push("--sg-color-warning-active: var(--warning-200);");
  props.push("--sg-color-warning-subtle: var(--warning-900);");
  props.push("--sg-color-danger: var(--danger-400);");
  props.push("--sg-color-danger-hover: var(--danger-300);");
  props.push("--sg-color-danger-active: var(--danger-200);");
  props.push("--sg-color-danger-subtle: var(--danger-900);");
  props.push("--sg-color-info: var(--info-400);");
  props.push("--sg-color-info-hover: var(--info-300);");
  props.push("--sg-color-info-active: var(--info-200);");
  props.push("--sg-color-info-subtle: var(--info-900);");
  const darkShadows = generateShadowScale({ keyOpacity: 0.2, ambientOpacity: 0.15 });
  for (const shadow of darkShadows) {
    props.push(`--sg-shadow-${shadow.name}: ${shadow.css};`);
  }
  const lines = [];
  lines.push("@layer sigui.tokens {");
  lines.push("@media (prefers-color-scheme: dark) {");
  lines.push("  :root:not([data-theme]) {");
  for (const p of props)
    lines.push("    " + p);
  lines.push("  }");
  lines.push("}");
  lines.push(':root[data-theme="dark"] {');
  lines.push("  color-scheme: dark;");
  for (const p of props)
    lines.push("  " + p);
  lines.push("}");
  lines.push("} /* @layer sigui.tokens */");
  lines.push("");
  return lines.join(`
`);
}
function generateBrandFiles(config) {
  if (!config.brands)
    return {};
  const result = {};
  for (const [name, brand] of Object.entries(config.brands)) {
    const lines = [];
    lines.push("@layer sigui.tokens {");
    lines.push(`[data-brand="${name}"] {`);
    if (brand.semanticOverrides) {
      for (const [path, value] of Object.entries(brand.semanticOverrides)) {
        const cssVar = `--sg-${path.replace(/\./g, "-")}`;
        lines.push(`  ${cssVar}: ${value};`);
      }
    }
    if (brand.componentOverrides) {
      for (const [path, value] of Object.entries(brand.componentOverrides)) {
        const cssVar = `--sg-${path.replace(/\./g, "-")}`;
        lines.push(`  ${cssVar}: ${value};`);
      }
    }
    lines.push("}");
    lines.push("} /* @layer sigui.tokens */");
    lines.push("");
    result[name] = lines.join(`
`);
  }
  return result;
}
function generateDensityFiles() {
  const variants = {
    compact: "0.75",
    comfortable: "1",
    spacious: "1.5"
  };
  const result = {};
  for (const [name, value] of Object.entries(variants)) {
    result[name] = [
      "@layer sigui.tokens {",
      `[data-density="${name}"] { --sg-density: ${value}; }`,
      "} /* @layer sigui.tokens */",
      ""
    ].join(`
`);
  }
  return result;
}
function generateComponents() {
  const lines = [];
  lines.push("@layer sigui.tokens {");
  lines.push(":root {");
  lines.push("  --sg-button-bg: var(--sg-color-primary);");
  lines.push("  --sg-button-text: var(--sg-color-text-inverse);");
  lines.push("  --sg-button-radius: var(--sg-radius-md);");
  lines.push("  --sg-button-padding-y: var(--sg-space-3);");
  lines.push("  --sg-button-padding-x: var(--sg-space-4);");
  lines.push("  --sg-input-bg: var(--sg-bg);");
  lines.push("  --sg-input-border: var(--sg-color-border);");
  lines.push("  --sg-input-radius: var(--sg-radius-md);");
  lines.push("  --sg-input-padding: var(--sg-space-3);");
  lines.push("  --sg-card-bg: var(--sg-surface-container);");
  lines.push("  --sg-card-border: 1px solid var(--sg-color-border);");
  lines.push("  --sg-card-shadow: var(--sg-shadow-sm);");
  lines.push("  --sg-card-radius: var(--sg-radius-lg);");
  lines.push("  --sg-card-padding: var(--sg-space-6);");
  lines.push("}");
  lines.push("[data-depth] { --sg-gap-by-depth: var(--sg-gap-related); }");
  lines.push('[data-depth="0"] { --sg-gap-by-depth: var(--sg-gap-distinct); }');
  lines.push('[data-depth="1"] { --sg-gap-by-depth: var(--sg-gap-separated); }');
  lines.push('[data-depth="2"] { --sg-gap-by-depth: var(--sg-gap-grouped); }');
  lines.push('[data-depth="3"] { --sg-gap-by-depth: var(--sg-gap-related); }');
  lines.push(".sg-gap-auto { gap: var(--sg-gap-by-depth, var(--sg-gap-grouped)); }");
  lines.push("} /* @layer sigui.tokens */");
  lines.push("");
  return lines.join(`
`);
}
function generateHighContrast() {
  const lines = [];
  lines.push("@layer sigui.tokens {");
  lines.push("@media (prefers-contrast: high) {");
  lines.push("  :root {");
  lines.push("    --sg-color-border: var(--brand-400);");
  lines.push("    --sg-color-border-light: var(--brand-600);");
  lines.push("    --sg-color-border-focus: var(--brand-700);");
  lines.push("    --sg-focus-width: 3px;");
  lines.push("    --sg-focus-offset: 3px;");
  lines.push("    --sg-disabled-opacity: 0.5;");
  lines.push("    --sg-state-hover-opacity: 0.12;");
  lines.push("    --sg-state-focus-opacity: 0.16;");
  lines.push("    --sg-state-active-opacity: 0.16;");
  lines.push("    --sg-border-width: 2px;");
  lines.push("    --sg-border-width-heavy: 3px;");
  lines.push("    --sg-glass-opacity: 1;");
  lines.push("    --sg-glass-blur: 0px;");
  lines.push("    --sg-divider-opacity: 0.5;");
  lines.push("  }");
  lines.push("  input, select, textarea { border-width: var(--sg-border-width); }");
  lines.push("  .card, .panel, .dialog { border-width: var(--sg-border-width); border-style: solid; border-color: var(--sg-color-border); }");
  lines.push("  .material-glass { background: var(--sg-bg); backdrop-filter: none; -webkit-backdrop-filter: none; }");
  lines.push("  :focus-visible { outline-width: var(--sg-focus-width); outline-offset: var(--sg-focus-offset); }");
  lines.push("}");
  lines.push("} /* @layer sigui.tokens */");
  lines.push("");
  return lines.join(`
`);
}
function generateReducedTransparency(config) {
  if (!config.cognitiveAccessibility)
    return "";
  const rt = config.cognitiveAccessibility.reducedTransparency;
  const hoverShift = rt?.lightnessShiftHover ?? -0.04;
  const focusShift = rt?.lightnessShiftFocus ?? -0.06;
  const activeShift = rt?.lightnessShiftActive ?? -0.08;
  const lines = [];
  lines.push("@layer sigui.tokens {");
  lines.push("@media (prefers-reduced-transparency: reduce) {");
  lines.push("  :root {");
  lines.push("    --sg-glass-opacity: 1;");
  lines.push("    --sg-glass-blur: 0px;");
  lines.push("    --sg-backdrop-opacity: 1;");
  lines.push("    --sg-backdrop-color: oklch(0.15 0 0);");
  lines.push(`    --sg-hover-bg-shift: ${hoverShift};`);
  lines.push(`    --sg-focus-bg-shift: ${focusShift};`);
  lines.push(`    --sg-active-bg-shift: ${activeShift};`);
  lines.push("  }");
  lines.push("  .material-glass { background: var(--sg-bg); backdrop-filter: none; -webkit-backdrop-filter: none; }");
  lines.push("  dialog::backdrop, [popover]::backdrop { background: oklch(0.15 0 0 / var(--sg-backdrop-opacity)); }");
  lines.push('  [disabled], [aria-disabled="true"] { opacity: 1; filter: saturate(0.3) brightness(1.2); color: var(--sg-color-text-muted); }');
  lines.push("}");
  lines.push("} /* @layer sigui.tokens */");
  lines.push("");
  return lines.join(`
`);
}
function generateI18nFile(config) {
  if (!config.i18n)
    return "";
  return generateI18nCSS({
    supportedLocales: config.i18n.supportedLocales,
    fontFamilies: config.i18n.fontFamilies,
    scriptOverrides: config.i18n.scriptOverrides,
    rtl: config.i18n.rtl,
    cjk: config.i18n.cjk
  });
}
function generateAllManifest(config) {
  const lines = [];
  lines.push("@layer sigui.reset, sigui.tokens, sigui.base, sigui.variants, sigui.states, sigui.utilities, sigui.overrides;");
  lines.push("");
  lines.push('@import "primitives.css";');
  lines.push('@import "semantic-light.css";');
  lines.push('@import "semantic-dark.css";');
  lines.push('@import "components.css";');
  lines.push('@import "high-contrast.css";');
  if (config.cognitiveAccessibility) {
    lines.push('@import "reduced-transparency.css";');
  }
  if (config.i18n) {
    lines.push('@import "i18n.css";');
  }
  if (config.brands) {
    for (const name of Object.keys(config.brands)) {
      lines.push(`@import "brand-${name}.css";`);
    }
  }
  for (const variant of ["compact", "comfortable", "spacious"]) {
    lines.push(`@import "density-${variant}.css";`);
  }
  lines.push("");
  return lines.join(`
`);
}
