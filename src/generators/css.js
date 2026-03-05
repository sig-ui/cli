// @ts-check

/**
 * SigUI CLI generators module for css.
 * @module
 */
import { resolveTheme, generateSemanticTokenDeclarations } from "@sig-ui/theme";
import {
  fromOklch,
  toOklch,
  normalizeHue,
  generateI18nCSS,
  getAspectRatioCSS,
  resolveIconConfig,
  generateAlphaRamp,
  generateBlackAlphaScale,
  generateWhiteAlphaScale,
  ALPHA_STOPS,
  getAllGridConfigs,
  BREAKPOINT_VALUES,
  BREAKPOINT_ORDER,
  CONTAINER_BREAKPOINT_VALUES,
  CONTAINER_BREAKPOINT_ORDER
} from "@sig-ui/core";
const LIGHT_BG = "#ffffff";
const DARK_BG = "#09090b";
const SHADE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
function buildDarkOverrideLines(config, darkSurfaces, darkShadowsFallback, darkShadowsOklch, allPalettes, darkRoles) {
  const d = [];
  d.push(`--surface-bg-lowest: ${darkSurfaces["bg.lowest"]};`);
  d.push(`--surface-bg: ${darkSurfaces["bg.primary"]};`);
  d.push(`--surface-bg-low: ${darkSurfaces["bg.low"]};`);
  d.push(`--surface-bg-secondary: ${darkSurfaces["bg.secondary"]};`);
  d.push(`--surface-bg-tertiary: ${darkSurfaces["bg.tertiary"]};`);
  d.push(`--surface-bg-highest: ${darkSurfaces["bg.highest"]};`);
  d.push(`--surface-border-default: ${darkSurfaces["border.default"]};`);
  d.push(`--surface-border-strong: ${darkSurfaces["border.strong"]};`);
  const semanticLines = generateSemanticTokenDeclarations(darkRoles, "dark");
  for (const line of semanticLines) {
    d.push(line);
  }
  for (const shadow of darkShadowsFallback) {
    d.push(`--sg-shadow-${shadow.name}: ${shadow.css};`);
  }
  if (config.icons) {
    const iconCfg = resolveIconConfig({ darkMode: config.icons.darkMode });
    const dm = iconCfg.darkMode;
    d.push(`--sg-icon-opacity: ${dm.outlinedOpacity};`);
    d.push(`--sg-icon-fill-l-offset: ${dm.filledLightnessOffset};`);
    d.push("@media (min-resolution: 2dppx) {");
    d.push(`  --sg-icon-opacity: ${dm.outlinedOpacityHiDPI};`);
    d.push(`  --sg-icon-fill-l-offset: ${dm.filledLightnessOffsetHiDPI};`);
    d.push("}");
  }
  d.push("--sg-state-hover: var(--sg-state-hover-dark);");
  d.push("--sg-state-focus: var(--sg-state-focus-dark);");
  d.push("--sg-state-active: var(--sg-state-active-dark);");
  d.push("--sg-state-dragged: var(--sg-state-dragged-dark);");
  d.push("@supports (color: oklch(0 0 0)) {");
  for (const shadow of darkShadowsOklch) {
    d.push(`  --sg-shadow-${shadow.name}: ${shadow.css};`);
  }
  d.push("}");
  const darkModeComp = config.typography?.darkModeCompensation ?? "weight";
  if (darkModeComp === "weight") {
    d.push("/* Typography irradiation compensation */");
    d.push("--sg-weight-normal: 300;");
    d.push("--sg-weight-medium: 400;");
    d.push("--sg-weight-semibold: 500;");
    d.push("--sg-weight-bold: 600;");
    d.push("--sg-weight-extrabold: 700;");
    d.push("letter-spacing: 0.01em;");
  } else if (darkModeComp === "grade") {
    d.push("/* Typography irradiation compensation (grade axis) */");
    d.push("font-variation-settings: 'GRAD' var(--sg-dark-grade-offset, -25);");
  }
  if (config.output?.alphaVariants === true && allPalettes) {
    const darkBgOklch = toOklch(DARK_BG);
    const alphaStopLabels = {
      0.05: "a5",
      0.1: "a10",
      0.2: "a20",
      0.3: "a30",
      0.5: "a50",
      0.75: "a75"
    };
    for (const [name, palette] of Object.entries(allPalettes)) {
      const alphaRamp = generateAlphaRamp(palette.ramp, darkBgOklch);
      for (const stop of SHADE_STOPS) {
        for (const alpha of ALPHA_STOPS) {
          const equiv = alphaRamp[stop][alpha];
          const label = alphaStopLabels[alpha] ?? `a${Math.round(alpha * 100)}`;
          d.push(`--${name}-${stop}-${label}: ${equiv.css};`);
        }
      }
    }
  }
  return d;
}
/**
 * generateTokenCSS.
 * @param {SiguiConfig} config
 * @returns {string}
 */
export function generateTokenCSS(config) {
  const resolved = resolveTheme(config);
  const lines = [];
  lines.push("/**");
  lines.push(" * SigUI Design System - Generated Tokens");
  lines.push(" */");
  lines.push("");
  lines.push("@layer sigui.tokens {");
  lines.push("");
  lines.push(":root {");
  const allPalettes = resolved.palettes;
  let isFirst = true;
  for (const [name, palette] of Object.entries(allPalettes)) {
    if (isFirst) {
      lines.push("  /* Brand palette */");
      for (const stop of SHADE_STOPS) {
        const color = palette.ramp[stop];
        if (!color)
          continue;
        lines.push(`  --brand-${stop}: ${fromOklch(color, "hex")};`);
      }
      lines.push("");
      isFirst = false;
      continue;
    }
    const isHarmonyDerived = config.harmony && !config.colors?.[name] && !config.roles?.[name];
    const isDefaultRole = ["danger", "success", "warning", "info"].includes(name);
    const isUserRole = config.roles?.[name];
    let comment;
    if (isHarmonyDerived && !isUserRole) {
      comment = `  /* ${name} palette (harmony-derived) */`;
    } else if (isDefaultRole && !isUserRole && !config.harmony) {
      comment = `  /* ${name} palette */`;
    } else if (config.colors?.[name]) {
      comment = `  /* ${name} palette */`;
    } else {
      comment = `  /* ${name} palette */`;
    }
    lines.push(comment);
    for (const stop of SHADE_STOPS) {
      const color = palette.ramp[stop];
      if (!color)
        continue;
      lines.push(`  --${name}-${stop}: ${fromOklch(color, "hex")};`);
    }
    lines.push("");
  }
  const lightSurfaces = resolved.surfaces.light;
  const darkSurfaces = resolved.surfaces.dark;
  lines.push("  /* Surface palette */");
  lines.push(`  --surface-bg-lowest: ${lightSurfaces["bg.lowest"]};`);
  lines.push(`  --surface-bg: ${lightSurfaces["bg.primary"]};`);
  lines.push(`  --surface-bg-low: ${lightSurfaces["bg.low"]};`);
  lines.push(`  --surface-bg-secondary: ${lightSurfaces["bg.secondary"]};`);
  lines.push(`  --surface-bg-tertiary: ${lightSurfaces["bg.tertiary"]};`);
  lines.push(`  --surface-bg-highest: ${lightSurfaces["bg.highest"]};`);
  lines.push(`  --surface-border-default: ${lightSurfaces["border.default"]};`);
  lines.push(`  --surface-border-strong: ${lightSurfaces["border.strong"]};`);
  lines.push("");
  lines.push("  /* Semantic colors */");
  const semanticLines = generateSemanticTokenDeclarations(resolved.semanticRoles.light);
  for (const line of semanticLines) {
    lines.push(`  ${line}`);
  }
  lines.push("  --sg-surface-container-lowest: var(--surface-bg-lowest);");
  lines.push("  --sg-surface-container-low: var(--surface-bg-low);");
  lines.push("  --sg-surface-container: var(--surface-bg-secondary);");
  lines.push("  --sg-surface-container-high: var(--surface-bg-tertiary);");
  lines.push("  --sg-surface-container-highest: var(--surface-bg-highest);");
  lines.push("  --sg-color-code-bg: var(--surface-bg-tertiary);");
  lines.push("  --sg-color-code-text: var(--neutral-800);");
  lines.push("  --sg-color-surface: var(--surface-bg-secondary);");
  lines.push("  --sg-color-surface-alt: var(--surface-bg-tertiary);");
  lines.push("  --sg-bg: var(--surface-bg);");
  for (let i = 0;i < 12; i++) {
    lines.push(`  --sg-color-data-${i + 1}: ${resolved.dataColors[i]};`);
  }
  lines.push("");
  lines.push("  /* Data viz patterns */");
  lines.push("  --sg-pattern-stripe: repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px 8px);");
  lines.push("  --sg-pattern-dot: radial-gradient(circle 1.5px, currentColor 100%, transparent 100%) 0 0 / 8px 8px;");
  lines.push("  --sg-pattern-cross: repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px 8px), repeating-linear-gradient(-45deg, currentColor 0 2px, transparent 2px 8px);");
  lines.push("  --sg-pattern-diagonal: repeating-linear-gradient(135deg, currentColor 0 2px, transparent 2px 8px);");
  for (let i = 1;i <= 6; i++) {
    const dash = i * 4;
    const gap = i * 2;
    lines.push(`  --sg-pattern-dash-${i}: ${dash} ${gap};`);
  }
  lines.push('  --sg-shape-circle: "circle";');
  lines.push('  --sg-shape-square: "square";');
  lines.push('  --sg-shape-triangle: "triangle";');
  lines.push('  --sg-shape-diamond: "diamond";');
  lines.push('  --sg-shape-cross: "cross";');
  lines.push('  --sg-shape-star: "star";');
  lines.push("  --sg-data-stroke-width: 1.5px;");
  lines.push("  --sg-data-marker-size: 8px;");
  lines.push("  --sg-data-gridline-width: 1px;");
  lines.push("");
  const typo = resolved.typography;
  const useFluid = !!typo.fluidScale;
  lines.push("  /* Typography */");
  lines.push(`  --sg-font-family: ${typo.fontFamily};`);
  lines.push(`  --sg-font-mono: ${typo.monoFontFamily};`);
  if (typo.displayFontFamily) {
    lines.push(`  --sg-font-display: ${typo.displayFontFamily};`);
  }
  const scaleKeys = ["2xs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
  if (useFluid) {
    const fluidScale = typo.fluidScale;
    for (const step of scaleKeys) {
      const fluid = fluidScale[step];
      if (fluid) {
        lines.push(`  --sg-text-${step}: ${fluid};`);
      } else {
        const size = typo.scale[step];
        lines.push(`  --sg-text-${step}: ${size}rem;`);
      }
      lines.push(`  --sg-leading-${step}: ${typo.lineHeights[step]};`);
    }
  } else {
    for (const step of scaleKeys) {
      const size = typo.scale[step];
      lines.push(`  --sg-text-${step}: ${size}rem;`);
      lines.push(`  --sg-leading-${step}: ${typo.lineHeights[step]};`);
    }
  }
  lines.push("");
  for (const step of scaleKeys) {
    lines.push(`  --sg-tracking-${step}: ${typo.letterSpacing[step]};`);
  }
  lines.push("");
  lines.push("  /* Semantic letter-spacing (for uppercase/label text) */");
  lines.push("  --sg-tracking-wide: 0.03em;");
  lines.push("  --sg-tracking-caps: 0.06em;");
  lines.push("");
  for (const [name, weight] of Object.entries(typo.fontWeights)) {
    lines.push(`  --sg-weight-${name}: ${weight};`);
  }
  lines.push("");
  for (const [name, value] of Object.entries(typo.measures)) {
    lines.push(`  --sg-measure-${name}: ${value};`);
  }
  lines.push("");
  lines.push("  --sg-leading-measure-offset: 0.1;");
  lines.push("");
  lines.push("  /* Semantic line-height (font-size independent) */");
  lines.push("  --sg-leading-none: 1;");
  lines.push("  --sg-leading-tight: 1.2;");
  lines.push("  --sg-leading-snug: 1.3;");
  lines.push("  --sg-leading-normal: 1.4;");
  lines.push("  --sg-leading-relaxed: 1.5;");
  lines.push("  --sg-leading-loose: 1.6;");
  const useFluidSpacing = !!resolved.spacing.fluidScale;
  lines.push("  /* Spacing */");
  const baseUnitRem = parseFloat((resolved.spacing.baseUnit / 16).toFixed(4));
  lines.push(`  --sg-base-unit: ${baseUnitRem}rem;`);
  if (useFluidSpacing) {
    const fluidScale = resolved.spacing.fluidScale;
    for (const [name, value] of fluidScale) {
      const cssName = name.replace(/\./g, "-");
      lines.push(`  --sg-space-${cssName}: ${value};`);
    }
  } else {
    const spacingScale = resolved.spacing.scale;
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
  lines.push("  --sg-gap-micro: var(--sg-space-0-5);");
  lines.push("  --sg-gap-tight: var(--sg-space-1);");
  lines.push("  --sg-gap-related: var(--sg-space-2);");
  lines.push("  --sg-gap-grouped: var(--sg-space-4);");
  lines.push("  --sg-gap-separated: var(--sg-space-8);");
  lines.push("  --sg-gap-distinct: var(--sg-space-16);");
  lines.push("  --sg-gap-inline: var(--sg-space-2);");
  lines.push("  --sg-gap-stack: var(--sg-space-4);");
  lines.push("  --sg-gap-section: var(--sg-space-12);");
  lines.push("  --sg-gap-targets: var(--sg-space-2);");
  lines.push("  --sg-pad-input: var(--sg-space-3);");
  lines.push("  --sg-pad-button-x: var(--sg-space-4);");
  lines.push("  --sg-pad-button-y: var(--sg-space-3);");
  lines.push("  --sg-pad-card: var(--sg-space-6);");
  lines.push("  --sg-pad-page: var(--sg-space-6);");
  lines.push("  --sg-chrome-height: var(--sg-space-14);");
  lines.push("  --sg-chrome-offset: var(--sg-chrome-height);");
  lines.push("");
  if (resolved.spacing.fontSpacing.size > 0) {
    lines.push("  /* Font spacing subsets (per type-scale step, grid-snapped) */");
    for (const step of scaleKeys) {
      const fs = resolved.spacing.fontSpacing.get(step);
      if (!fs)
        continue;
      lines.push(`  --sg-font-gap-${step}: ${fs.gap}px;`);
      lines.push(`  --sg-font-pad-x-${step}: ${fs.padX}px;`);
      lines.push(`  --sg-font-pad-y-${step}: ${fs.padY}px;`);
      lines.push(`  --sg-font-gap-stack-${step}: ${fs.gapStack}px;`);
      lines.push(`  --sg-font-min-height-${step}: ${fs.minHeight}px;`);
    }
    lines.push("");
  }
  lines.push("  /* Elevation (sRGB fallback) */");
  for (const shadow of resolved.elevation.shadowsFallback) {
    lines.push(`  --sg-shadow-${shadow.name}: ${shadow.css};`);
  }
  lines.push("");
  lines.push("  /* Border radius */");
  for (const [name, value] of Object.entries(resolved.elevation.radii)) {
    if (value === 0) {
      lines.push(`  --sg-radius-${name}: 0;`);
    } else if (value === 9999) {
      lines.push(`  --sg-radius-${name}: 9999px;`);
    } else {
      lines.push(`  --sg-radius-${name}: ${value / 16}rem;`);
    }
  }
  lines.push("");
  lines.push("  --sg-corner-shape: round;");
  lines.push("  /* Border width */");
  for (const [name, value] of Object.entries(resolved.elevation.borders)) {
    lines.push(`  --sg-border-${name}: ${value === 0 ? "0" : `${value}px`};`);
  }
  lines.push("");
  lines.push("  /* Z-index */");
  for (const [name, value] of Object.entries(resolved.elevation.zIndex)) {
    lines.push(`  --sg-z-${name}: ${value};`);
  }
  lines.push("");
  lines.push("  /* Motion - durations */");
  const baseDurations = {
    instant: 0,
    faster: 50,
    fast: 100,
    normal: 200,
    moderate: 300,
    slow: 400,
    slower: 500
  };
  lines.push(`  --sg-duration-instant: 0ms;`);
  for (const [name, ms] of Object.entries(baseDurations)) {
    if (name === "instant")
      continue;
    lines.push(`  --sg-duration-${name}-base: ${ms}ms;`);
  }
  for (const [name] of Object.entries(baseDurations)) {
    if (name === "instant")
      continue;
    lines.push(`  --sg-duration-${name}: calc(var(--sg-duration-${name}-base) * var(--sg-duration-scalar));`);
  }
  for (const [name, ms] of Object.entries(resolved.motion.durations)) {
    if (name.startsWith("spring-")) {
      lines.push(`  --sg-duration-${name}: ${ms}ms;`);
    }
  }
  lines.push("");
  lines.push("  /* Motion - easings */");
  for (const [name, css] of Object.entries(resolved.motion.easings)) {
    lines.push(`  --sg-ease-${name}: ${css};`);
  }
  lines.push("");
  lines.push(`  --sg-duration-scalar: ${resolved.motion.durationScale};`);
  lines.push("");
  lines.push("  /* Interactive */");
  lines.push(`  --sg-focus-color: ${resolved.interactive.focusColor};`);
  lines.push(`  --sg-focus-width: ${resolved.interactive.focusWidth}px;`);
  lines.push(`  --sg-focus-offset: ${resolved.interactive.focusOffset}px;`);
  lines.push("  --sg-focus-inner: white;");
  lines.push("  --sg-disabled-opacity: 0.38;");
  lines.push("  --sg-disabled-container-opacity: 0.12;");
  lines.push(`  --sg-state-hover-opacity: ${resolved.interactive.stateHoverOpacity};`);
  lines.push(`  --sg-state-focus-opacity: ${resolved.interactive.stateFocusOpacity};`);
  lines.push(`  --sg-state-active-opacity: ${resolved.interactive.stateActiveOpacity};`);
  lines.push("");
  lines.push("  /* State layer overlays (sRGB fallback) */");
  lines.push("  --sg-state-hover-light: rgba(0, 0, 0, 0.08);");
  lines.push("  --sg-state-hover-dark: rgba(255, 255, 255, 0.08);");
  lines.push("  --sg-state-focus-light: rgba(0, 0, 0, 0.12);");
  lines.push("  --sg-state-focus-dark: rgba(255, 255, 255, 0.12);");
  lines.push("  --sg-state-active-light: rgba(0, 0, 0, 0.12);");
  lines.push("  --sg-state-active-dark: rgba(255, 255, 255, 0.16);");
  lines.push("  --sg-state-dragged-light: rgba(0, 0, 0, 0.16);");
  lines.push("  --sg-state-dragged-dark: rgba(255, 255, 255, 0.16);");
  lines.push("  --sg-state-hover: var(--sg-state-hover-light);");
  lines.push("  --sg-state-focus: var(--sg-state-focus-light);");
  lines.push("  --sg-state-active: var(--sg-state-active-light);");
  lines.push("  --sg-state-dragged: var(--sg-state-dragged-light);");
  lines.push("  --sg-overlay-backdrop: rgba(0, 0, 0, 0.4);");
  lines.push("");
  lines.push("  /* Validation states */");
  lines.push("  --sg-valid-border: var(--sg-color-success);");
  lines.push("  --sg-invalid-border: var(--sg-color-danger);");
  lines.push("  --sg-valid-bg: var(--sg-color-success-subtle);");
  lines.push("  --sg-invalid-bg: var(--sg-color-danger-subtle);");
  lines.push("");
  lines.push("  /* Scroll padding */");
  lines.push("  --sg-scroll-padding-top: var(--sg-header-height, 64px);");
  lines.push("  --sg-scroll-padding-bottom: var(--sg-footer-height, 0px);");
  lines.push("");
  lines.push("  --sg-target-min-touch: 2.75rem;");
  lines.push("  --sg-target-min-pointer: 1.5rem;");
  lines.push("  --sg-target-min: var(--sg-target-min-pointer);");
  lines.push("");
  const defaultGrid = getAllGridConfigs().default;
  lines.push(`  --sg-grid-columns: ${defaultGrid.columns};`);
  lines.push(`  --sg-grid-gutter: ${defaultGrid.gutter / 16}rem;`);
  lines.push(`  --sg-grid-margin: ${defaultGrid.margin / 16}rem;`);
  lines.push(`  --sg-grid-max-width: ${defaultGrid.maxWidth ? `${defaultGrid.maxWidth / 16}rem` : "100%"};`);
  lines.push("");
  lines.push(`  --sg-density: var(--sg-adaptive-density, ${resolved.density.factor});`);
  lines.push("  --sg-ctx-scale: 1;");
  lines.push("  --sg-icon-compensation: 0.20;");
  lines.push("");
  lines.push("  /* Aspect ratio tokens */");
  const aspectRatios = getAspectRatioCSS();
  for (const [prop, value] of Object.entries(aspectRatios)) {
    lines.push(`  ${prop}: ${value};`);
  }
  lines.push("");
  if (config.performance) {
    lines.push("  /* Content visibility (Spec 10 §4.4) */");
    lines.push("  --contain-intrinsic-height-sm: 300px;");
    lines.push("  --contain-intrinsic-height-md: 500px;");
    lines.push("  --contain-intrinsic-height-lg: 800px;");
    lines.push("");
    lines.push("  /* Animation budget (Spec 10 §3.4) */");
    lines.push("  --max-concurrent-animations: 10;");
    lines.push("  --raf-budget-ms: 10;");
    lines.push("");
  }
  if (config.icons) {
    const iconCfg = resolveIconConfig({
      sizes: config.icons.sizes ? Object.fromEntries(Object.entries(config.icons.sizes).map(([k, v]) => [
        k,
        { px: v, rem: v / 16, strokeWidth: v <= 16 ? 1.25 : v <= 24 ? 1.5 : 2 }
      ])) : undefined,
      strokes: config.icons.strokes ? Object.fromEntries(Object.entries(config.icons.strokes).map(([k, v]) => [
        k,
        { width: v, cornerRadius: v * (config.icons.cornerRadiusRatio ?? 0.5) }
      ])) : undefined,
      strokeProfile: config.icons.strokeProfile,
      cornerRadiusRatio: config.icons.cornerRadiusRatio,
      darkMode: config.icons.darkMode,
      delivery: config.icons.delivery,
      aliases: config.icons.aliases,
      verticalAlign: config.icons.verticalAlign
    });
    const profile = iconCfg.strokeProfile === "geometric" ? { linecap: "square", linejoin: "miter" } : { linecap: "round", linejoin: "round" };
    lines.push("");
    lines.push("  /* Icon tokens (Spec 12) */");
    for (const [token, def] of Object.entries(iconCfg.sizes)) {
      lines.push(`  --sg-icon-size-${token}: ${def.rem}rem;`);
    }
    for (const [token, def] of Object.entries(iconCfg.strokes)) {
      lines.push(`  --sg-icon-stroke-${token}: ${def.width}px;`);
    }
    lines.push(`  --sg-icon-linecap: ${profile.linecap};`);
    lines.push(`  --sg-icon-linejoin: ${profile.linejoin};`);
    lines.push(`  --sg-icon-corner-radius: ${iconCfg.cornerRadiusRatio};`);
    lines.push(`  --sg-icon-color: currentColor;`);
    lines.push(`  --sg-icon-color-success: var(--sg-color-success);`);
    lines.push(`  --sg-icon-color-warning: var(--sg-color-warning);`);
    lines.push(`  --sg-icon-color-danger: var(--sg-color-danger);`);
    lines.push(`  --sg-icon-color-info: var(--sg-color-info);`);
    lines.push(`  --sg-icon-opacity: 1;`);
    lines.push(`  --sg-icon-fill-l-offset: 0;`);
    if (config.icons.delivery === "font") {
      const fontVariant = config.icons.fontVariant ?? "outlined";
      const fontWeight = config.icons.fontWeight ?? 400;
      const fontGrade = config.icons.fontGrade ?? 0;
      lines.push(`  --sg-icon-font-variant: ${fontVariant};`);
      lines.push(`  --sg-icon-font-weight: ${fontWeight};`);
      lines.push(`  --sg-icon-font-grade: ${fontGrade};`);
      lines.push("  --sg-icon-opsz-xs: 20;");
      lines.push("  --sg-icon-opsz-sm: 20;");
      lines.push("  --sg-icon-opsz-md: 20;");
      lines.push("  --sg-icon-opsz-default: 24;");
      lines.push("  --sg-icon-opsz-lg: 40;");
      lines.push("  --sg-icon-opsz-xl: 48;");
    }
    lines.push("");
  }
  if (config.output?.overlays !== false && (config.output?.overlays || config.output?.alphaVariants)) {
    const blackAlpha = generateBlackAlphaScale();
    const whiteAlpha = generateWhiteAlphaScale();
    lines.push("  /* Overlay scales - BlackAlpha */");
    for (const step of blackAlpha) {
      lines.push(`  --sg-black-a-${step.step}: ${step.css};`);
    }
    lines.push("");
    lines.push("  /* Overlay scales - WhiteAlpha */");
    for (const step of whiteAlpha) {
      lines.push(`  --sg-white-a-${step.step}: ${step.css};`);
    }
    lines.push("");
  }
  if (config.output?.alphaVariants === true) {
    const bgOklch = toOklch(LIGHT_BG);
    const alphaStopLabels = {
      0.05: "a5",
      0.1: "a10",
      0.2: "a20",
      0.3: "a30",
      0.5: "a50",
      0.75: "a75"
    };
    lines.push("  /* Pre-computed alpha equivalents */");
    for (const [name, palette] of Object.entries(allPalettes)) {
      const alphaRamp = generateAlphaRamp(palette.ramp, bgOklch);
      for (const stop of SHADE_STOPS) {
        for (const alpha of ALPHA_STOPS) {
          const equiv = alphaRamp[stop][alpha];
          const label = alphaStopLabels[alpha] ?? `a${Math.round(alpha * 100)}`;
          lines.push(`  --${name}-${stop}-${label}: ${equiv.css};`);
        }
      }
    }
    lines.push("");
  }
  lines.push("  /* Container query breakpoints */");
  for (const name of CONTAINER_BREAKPOINT_ORDER) {
    const value = CONTAINER_BREAKPOINT_VALUES[name];
    const shortName = name.replace("container-", "");
    lines.push(`  --sg-container-${shortName}: ${value}px;`);
  }
  lines.push("");
  lines.push("  /* Component tokens */");
  lines.push("  --sg-button-bg: var(--sg-color-primary);");
  lines.push("  --sg-button-text: var(--sg-color-text-inverse);");
  lines.push("  --sg-button-radius: var(--sg-radius-md);");
  lines.push("  --sg-button-padding-y: var(--sg-space-3);");
  lines.push("  --sg-button-padding-x: var(--sg-space-4);");
  lines.push("  --sg-input-bg: var(--sg-bg);");
  lines.push("  --sg-input-border: var(--sg-color-border);");
  lines.push("  --sg-input-border-focus: var(--sg-focus-color);");
  lines.push("  --sg-input-border-invalid: var(--sg-color-danger);");
  lines.push("  --sg-input-radius: var(--sg-radius-md);");
  lines.push("  --sg-input-padding: var(--sg-space-3);");
  lines.push("  --sg-card-bg: var(--sg-surface-container);");
  lines.push("  --sg-card-border: 1px solid var(--sg-color-border);");
  lines.push("  --sg-card-shadow: var(--sg-shadow-xs);");
  lines.push("  --sg-card-shadow-hover: var(--sg-shadow-md);");
  lines.push("  --sg-card-radius: var(--sg-radius-lg);");
  lines.push("  --sg-card-padding: var(--sg-space-6);");
  lines.push("  --sg-baseline-shift: 1px;");
  lines.push("");
  lines.push("  /* Semantic elevation */");
  lines.push("  --sg-shadow-card: var(--sg-shadow-xs);");
  lines.push("  --sg-shadow-dropdown: var(--sg-shadow-md);");
  lines.push("");
  lines.push("  /* Semantic motion */");
  lines.push("  --sg-transition-default: var(--sg-duration-normal) var(--sg-ease-default);");
  lines.push("");
  lines.push("  /* OKLCH progressive enhancement */");
  lines.push("  @supports (color: oklch(0 0 0)) {");
  for (const [name, palette] of Object.entries(allPalettes)) {
    for (const stop of SHADE_STOPS) {
      const color = palette.ramp[stop];
      if (!color)
        continue;
      const prefix = name === "brand" ? "brand" : name;
      lines.push(`    --${prefix}-${stop}: ${fromOklch(color, "oklch")};`);
    }
  }
  for (const shadow of resolved.elevation.shadows) {
    lines.push(`    --sg-shadow-${shadow.name}: ${shadow.css};`);
  }
  lines.push("    --sg-state-hover-light: oklch(0 0 0 / 0.08);");
  lines.push("    --sg-state-hover-dark: oklch(1 0 0 / 0.08);");
  lines.push("    --sg-state-focus-light: oklch(0 0 0 / 0.12);");
  lines.push("    --sg-state-focus-dark: oklch(1 0 0 / 0.12);");
  lines.push("    --sg-state-active-light: oklch(0 0 0 / 0.12);");
  lines.push("    --sg-state-active-dark: oklch(1 0 0 / 0.16);");
  lines.push("    --sg-state-dragged-light: oklch(0 0 0 / 0.16);");
  lines.push("    --sg-state-dragged-dark: oklch(1 0 0 / 0.16);");
  lines.push("    --sg-overlay-backdrop: oklch(0 0 0 / 0.4);");
  lines.push("  }");
  lines.push("");
  if (resolved.squircle) {
    lines.push("  @supports (corner-shape: squircle) {");
    lines.push("    --sg-corner-shape: squircle;");
    lines.push("  }");
    lines.push("");
  }
  lines.push("  /* Baseline shift fallback */");
  lines.push("  @supports not (text-box-trim: both) {");
  lines.push("    --sg-button-padding-block-start: calc(var(--sg-space-3) + var(--sg-baseline-shift));");
  lines.push("    --sg-button-padding-block-end: var(--sg-space-3);");
  lines.push("  }");
  lines.push("");
  const darkOverrides = buildDarkOverrideLines(config, darkSurfaces, resolved.elevation.darkShadowsFallback, resolved.elevation.darkShadows, allPalettes, resolved.semanticRoles.dark);
  if (resolved.appearance === "dark") {
    lines.push("  /* Dark mode - forced */");
    lines.push("  color-scheme: dark;");
    for (const l of darkOverrides)
      lines.push("  " + l);
    lines.push("");
  } else if (resolved.appearance !== "light") {
    lines.push("  /* Dark mode - auto (OS preference, unless data-theme is set) */");
    lines.push("  &:not([data-theme]) {");
    lines.push("    @media (prefers-color-scheme: dark) {");
    for (const l of darkOverrides)
      lines.push("      " + l);
    lines.push("    }");
    lines.push("  }");
    lines.push("");
    lines.push('  /* Dark mode - manual ([data-theme="dark"]) */');
    lines.push('  &[data-theme="dark"] {');
    lines.push("    color-scheme: dark;");
    for (const l of darkOverrides)
      lines.push("    " + l);
    lines.push("  }");
    lines.push("");
  }
  lines.push("  /* High contrast overrides */");
  lines.push("  @media (prefers-contrast: high) {");
  lines.push("    --sg-color-border: var(--sg-color-primary);");
  lines.push("    --sg-color-border-light: var(--sg-color-primary-hover);");
  lines.push("    --sg-color-border-focus: var(--sg-color-primary-active);");
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
  lines.push("    /* Data viz high contrast overrides */");
  lines.push("    --sg-data-stroke-width: 2px;");
  lines.push("    --sg-data-marker-size: 10px;");
  lines.push("    --sg-data-gridline-width: 2px;");
  {
    const pOklch = toOklch(config.brand);
    for (let i = 0;i < 12; i++) {
      const hue = normalizeHue(pOklch.h + i * 30);
      const hex = fromOklch({ l: 0.55, c: 0.2, h: hue, alpha: 1 }, "hex");
      lines.push(`    --sg-color-data-${i + 1}: ${hex};`);
    }
  }
  lines.push("  }");
  lines.push("  @media (prefers-reduced-motion: reduce) {");
  lines.push("    --sg-duration-scalar: 0.01;");
  lines.push("  }");
  lines.push("}");
  lines.push("");
  const allGridConfigs = getAllGridConfigs();
  const gridPropToCSS = (prop, value) => {
    if (prop === "maxWidth")
      return value ? `${value / 16}rem` : "100%";
    if (prop === "columns")
      return String(value);
    return `${value / 16}rem`;
  };
  let prevGrid = allGridConfigs.default;
  for (const bp of BREAKPOINT_ORDER) {
    const gridConfig = allGridConfigs[bp];
    if (!gridConfig)
      continue;
    const diffs = [];
    for (const prop of ["columns", "gutter", "margin", "maxWidth"]) {
      if (gridConfig[prop] !== prevGrid[prop]) {
        diffs.push(`  --sg-grid-${prop === "maxWidth" ? "max-width" : prop}: ${gridPropToCSS(prop, gridConfig[prop])};`);
      }
    }
    if (diffs.length > 0) {
      lines.push(`@media (min-width: ${BREAKPOINT_VALUES[bp]}px) {`);
      lines.push("  :root {");
      for (const d of diffs)
        lines.push(`  ${d}`);
      lines.push("  }");
      lines.push("}");
      lines.push("");
    }
    prevGrid = gridConfig;
  }
  if (resolved.depthPreset === "flat") {
    lines.push("/* Flat depth: surfaces use borders instead of shadows */");
    lines.push(".card, .panel, .dialog, [data-sigui-surface] {");
    lines.push("  border: var(--sg-border-thin, 1px) solid var(--sg-color-border);");
    lines.push("}");
    lines.push("");
  }
  if (resolved.squircle) {
    lines.push("@supports (corner-shape: squircle) {");
    lines.push("  .card, .button, .dialog, .badge, .input, .panel,");
    lines.push("  [data-sigui-surface] {");
    lines.push("    corner-shape: squircle;");
    lines.push("  }");
    lines.push("}");
    lines.push("");
  }
  lines.push("@media (prefers-contrast: high) {");
  lines.push("  input, select, textarea { border-width: var(--sg-border-width); }");
  lines.push("  .card, .panel, .dialog { border-width: var(--sg-border-width); border-style: solid; border-color: var(--sg-color-border); }");
  lines.push("  .material-glass { background: var(--sg-bg); backdrop-filter: none; -webkit-backdrop-filter: none; }");
  lines.push("  :focus-visible { outline-width: var(--sg-focus-width); outline-offset: var(--sg-focus-offset); }");
  lines.push("}");
  lines.push("");
  lines.push('[data-density="compact"] { --sg-density: 0.75; }');
  lines.push('[data-density="comfortable"] { --sg-density: 1; }');
  lines.push('[data-density="spacious"] { --sg-density: 1.5; }');
  lines.push("");
  lines.push("[data-depth] { --sg-gap-by-depth: var(--sg-gap-related); }");
  lines.push('[data-depth="0"] { --sg-gap-by-depth: var(--sg-gap-distinct); }');
  lines.push('[data-depth="1"] { --sg-gap-by-depth: var(--sg-gap-separated); }');
  lines.push('[data-depth="2"] { --sg-gap-by-depth: var(--sg-gap-grouped); }');
  lines.push('[data-depth="3"] { --sg-gap-by-depth: var(--sg-gap-related); }');
  lines.push(".sg-gap-auto { gap: var(--sg-gap-by-depth, var(--sg-gap-grouped)); }");
  lines.push("");
  lines.push('[data-motion="instant"]  { --sg-duration-scalar: 0.05; }');
  lines.push('[data-motion="snappy"]   { --sg-duration-scalar: 0.5; }');
  lines.push('[data-motion="smooth"]   { --sg-duration-scalar: 1; }');
  lines.push('[data-motion="playful"]  { --sg-duration-scalar: 1.3; }');
  lines.push("");
  if (config.brands) {
    for (const [name, brand] of Object.entries(config.brands)) {
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
      lines.push("");
    }
  }
  lines.push("} /* @layer sigui.tokens */");
  lines.push("");
  if (config.cognitiveAccessibility) {
    const rt = config.cognitiveAccessibility.reducedTransparency;
    const hoverShift = rt?.lightnessShiftHover ?? -0.04;
    const focusShift = rt?.lightnessShiftFocus ?? -0.06;
    const activeShift = rt?.lightnessShiftActive ?? -0.08;
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
  }
  if (config.i18n) {
    lines.push("/* i18n overrides (Spec 08) */");
    lines.push(generateI18nCSS({
      supportedLocales: config.i18n.supportedLocales,
      fontFamilies: config.i18n.fontFamilies,
      scriptOverrides: config.i18n.scriptOverrides,
      rtl: config.i18n.rtl,
      cjk: config.i18n.cjk
    }));
  }
  return lines.join(`
`);
}
