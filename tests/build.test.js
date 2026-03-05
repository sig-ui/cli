// @ts-check

/**
 * Repository module for build.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import { generateTokenCSS } from "../src/generators/css.js";
import { generateBundleCSS } from "../src/generators/bundle.js";
import { generateTypeScriptTokens } from "../src/generators/typescript.js";
import { generateJSONTokens } from "../src/generators/json.js";
import { getBorderScale, measureTokens } from "@sig-ui/core";
describe("generateTokenCSS", () => {
  const config = {
    brand: "#6366f1"
  };
  const css = generateTokenCSS(config);
  test("wraps output in @layer sigui.tokens", () => {
    expect(css).toContain("@layer sigui.tokens {");
    expect(css).toContain("} /* @layer sigui.tokens */");
  });
  test("generates brand palette primitives", () => {
    expect(css).toContain("--brand-50:");
    expect(css).toContain("--brand-500:");
    expect(css).toContain("--brand-950:");
  });
  test("generates surface palette primitives", () => {
    expect(css).toContain("--surface-bg:");
    expect(css).toContain("--surface-bg-secondary:");
    expect(css).toContain("--surface-bg-tertiary:");
    expect(css).toContain("--surface-border-default:");
    expect(css).toContain("--surface-border-strong:");
  });
  test("generates semantic color tokens referencing surfaces", () => {
    expect(css).toContain("--sg-color-primary: var(--brand-700)");
    expect(css).toContain("--sg-color-text:");
    expect(css).toContain("--sg-bg: var(--surface-bg)");
    expect(css).toContain("--sg-surface-container: var(--surface-bg-secondary)");
    expect(css).toContain("--sg-surface-container-high: var(--surface-bg-tertiary)");
    expect(css).toContain("--sg-color-border: var(--neutral-300)");
    expect(css).toContain("--sg-color-border-light: var(--neutral-200)");
  });
  test("generates role palettes", () => {
    expect(css).toContain("--danger-500:");
    expect(css).toContain("--success-500:");
    expect(css).toContain("--warning-500:");
    expect(css).toContain("--info-500:");
  });
  test("generates typography tokens", () => {
    expect(css).toContain("--sg-text-xs:");
    expect(css).toContain("--sg-text-base:");
    expect(css).toContain("--sg-text-6xl:");
    expect(css).toContain("--sg-leading-base:");
    expect(css).toContain("--sg-font-family:");
    expect(css).toContain("--sg-font-mono:");
  });
  test("generates spacing tokens with base unit and fluid clamp", () => {
    expect(css).toContain("--sg-base-unit:");
    expect(css).toContain("--sg-space-1:");
    expect(css).toContain("--sg-space-4:");
    expect(css).toContain("--sg-space-16:");
    expect(css).toMatch(/--sg-space-4:\s*clamp\(/);
    expect(css).toContain("--sg-space-0: 0;");
    expect(css).toContain("--sg-space-px: 0.0625rem;");
  });
  test("generates relationship spacing", () => {
    expect(css).toContain("--sg-gap-micro:");
    expect(css).toContain("--sg-gap-tight:");
    expect(css).toContain("--sg-gap-related:");
    expect(css).toContain("--sg-gap-grouped:");
    expect(css).toContain("--sg-gap-separated:");
    expect(css).toContain("--sg-gap-distinct:");
  });
  test("generates depth-based relationship utility selectors", () => {
    expect(css).toContain('[data-depth="0"] { --sg-gap-by-depth: var(--sg-gap-distinct); }');
    expect(css).toContain('[data-depth="1"] { --sg-gap-by-depth: var(--sg-gap-separated); }');
    expect(css).toContain(".sg-gap-auto { gap: var(--sg-gap-by-depth, var(--sg-gap-grouped)); }");
  });
  test("generates elevation tokens", () => {
    expect(css).toContain("--sg-shadow-none:");
    expect(css).toContain("--sg-shadow-xs:");
    expect(css).toContain("--sg-shadow-xl:");
  });
  test("generates motion tokens", () => {
    expect(css).toContain("--sg-duration-fast:");
    expect(css).toContain("--sg-duration-normal:");
    expect(css).toContain("--sg-ease-default:");
    expect(css).toContain("--sg-ease-spring:");
  });
  test("generates interactive tokens", () => {
    expect(css).toContain("--sg-focus-color:");
    expect(css).toContain("--sg-focus-width:");
    expect(css).toContain("--sg-disabled-opacity:");
    expect(css).toContain("--sg-state-hover-opacity:");
  });
  test("generates component tokens", () => {
    expect(css).toContain("--sg-button-bg:");
    expect(css).toContain("--sg-button-radius:");
    expect(css).toContain("--sg-input-bg:");
    expect(css).toContain("--sg-card-bg:");
  });
  test("includes @supports oklch block", () => {
    expect(css).toContain("@supports (color: oklch(0 0 0))");
  });
  test("includes dark mode overrides", () => {
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain('[data-theme="dark"]');
  });
  test("custom brand generates different values", () => {
    const redCss = generateTokenCSS({ brand: "#ef4444" });
    expect(redCss).toContain("--brand-500:");
    expect(redCss).not.toBe(css);
  });
  test("includes high contrast block with correct opacity values", () => {
    expect(css).toContain("@media (prefers-contrast: high)");
    expect(css).toContain("--sg-focus-width: 3px");
    expect(css).toContain("--sg-state-hover-opacity: 0.12");
    expect(css).toContain("--sg-state-focus-opacity: 0.16");
    expect(css).toContain("--sg-state-active-opacity: 0.16");
  });
  test("high contrast includes border-width and glass tokens", () => {
    expect(css).toContain("--sg-border-width: 2px");
    expect(css).toContain("--sg-border-width-heavy: 3px");
    expect(css).toContain("--sg-glass-opacity: 1");
    expect(css).toContain("--sg-glass-blur: 0px");
    expect(css).toContain("--sg-divider-opacity: 0.5");
  });
  test("high contrast includes element-level rules", () => {
    expect(css).toContain("input, select, textarea { border-width: var(--sg-border-width)");
    expect(css).toContain(".material-glass { background: var(--sg-bg)");
    expect(css).toContain(":focus-visible { outline-width: var(--sg-focus-width)");
  });
  test("generates data viz pattern tokens", () => {
    expect(css).toContain("--sg-pattern-stripe:");
    expect(css).toContain("--sg-pattern-dot:");
    expect(css).toContain("--sg-pattern-cross:");
    expect(css).toContain("--sg-pattern-diagonal:");
    expect(css).toContain("--sg-pattern-dash-1:");
    expect(css).toContain("--sg-pattern-dash-6:");
  });
  test("generates shape tokens", () => {
    expect(css).toContain('--sg-shape-circle: "circle"');
    expect(css).toContain('--sg-shape-square: "square"');
    expect(css).toContain('--sg-shape-star: "star"');
  });
  test("generates data viz sizing defaults", () => {
    expect(css).toContain("--sg-data-stroke-width: 1.5px");
    expect(css).toContain("--sg-data-marker-size: 8px");
    expect(css).toContain("--sg-data-gridline-width: 1px");
  });
  test("high contrast overrides data viz sizing", () => {
    expect(css).toContain("--sg-data-stroke-width: 2px");
    expect(css).toContain("--sg-data-marker-size: 10px");
    expect(css).toContain("--sg-data-gridline-width: 2px");
  });
  test("high contrast regenerates data tokens with max chroma", () => {
    const highContrastIdx = css.indexOf("@media (prefers-contrast: high)");
    const afterHC = css.slice(highContrastIdx);
    expect(afterHC).toContain("--sg-color-data-1:");
    expect(afterHC).toContain("--sg-color-data-12:");
  });
  test("fluid spacing produces clamp() by default", () => {
    const fluidConfig = {
      brand: "#6366f1"
    };
    const fluidCss = generateTokenCSS(fluidConfig);
    expect(fluidCss).toMatch(/--sg-space-4:\s*clamp\(/);
    expect(fluidCss).toMatch(/--sg-space-4:\s*clamp\([^;]*min\(/);
  });
  test("fluid spacing supports linear opt-out", () => {
    const linearConfig = {
      brand: "#6366f1",
      fluidTokens: { fluidEasing: "linear" }
    };
    const linearCss = generateTokenCSS(linearConfig);
    expect(linearCss).toMatch(/--sg-space-4:\s*clamp\(/);
    expect(linearCss).not.toMatch(/--sg-space-4:\s*clamp\([^;]*min\(/);
  });
  test("fluid spacing is NOT used when disabled", () => {
    const staticConfig = {
      brand: "#6366f1",
      fluidTokens: { enabled: false }
    };
    const staticCss = generateTokenCSS(staticConfig);
    expect(staticCss).toMatch(/--sg-space-4:\s*calc\(4 \* var\(--sg-base-unit\)\)/);
  });
  test("config without new fields produces identical base output", () => {
    const minimalConfig = { brand: "#6366f1" };
    const minimalCss = generateTokenCSS(minimalConfig);
    expect(minimalCss).toContain("@layer sigui.tokens {");
    expect(minimalCss).toContain("--brand-500:");
    expect(minimalCss).toContain("--sg-space-4:");
    expect(minimalCss).toContain("@media (prefers-contrast: high)");
  });
  test("brand overrides are emitted as data-brand selectors", () => {
    const brandConfig = {
      brand: "#6366f1",
      brands: {
        acme: {
          displayName: "Acme",
          semanticOverrides: { "color.action.primary": "var(--brand-600)" }
        }
      }
    };
    const brandCss = generateTokenCSS(brandConfig);
    expect(brandCss).toContain('[data-brand="acme"]');
    expect(brandCss).toContain("--sg-color-action");
  });
  test("no reduced-transparency block when COGA config absent (zero overhead)", () => {
    const noCogaConfig = { brand: "#6366f1" };
    const noCogaCss = generateTokenCSS(noCogaConfig);
    expect(noCogaCss).not.toContain("prefers-reduced-transparency");
  });
  test("reduced-transparency block emitted when COGA config present", () => {
    const cogaConfig = {
      brand: "#6366f1",
      cognitiveAccessibility: {}
    };
    const cogaCss = generateTokenCSS(cogaConfig);
    expect(cogaCss).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(cogaCss).toContain("--sg-glass-opacity: 1");
    expect(cogaCss).toContain("--sg-glass-blur: 0px");
    expect(cogaCss).toContain("--sg-backdrop-opacity: 1");
    expect(cogaCss).toContain(".material-glass");
    expect(cogaCss).toContain("dialog::backdrop");
    expect(cogaCss).toContain("[aria-disabled");
  });
  test("reduced-transparency uses default lightness shift values", () => {
    const cogaConfig = {
      brand: "#6366f1",
      cognitiveAccessibility: {}
    };
    const cogaCss = generateTokenCSS(cogaConfig);
    expect(cogaCss).toContain("--sg-hover-bg-shift: -0.04");
    expect(cogaCss).toContain("--sg-focus-bg-shift: -0.06");
    expect(cogaCss).toContain("--sg-active-bg-shift: -0.08");
  });
  test("reduced-transparency respects custom lightness shift overrides", () => {
    const cogaConfig = {
      brand: "#6366f1",
      cognitiveAccessibility: {
        reducedTransparency: {
          lightnessShiftHover: -0.05,
          lightnessShiftFocus: -0.08,
          lightnessShiftActive: -0.1
        }
      }
    };
    const cogaCss = generateTokenCSS(cogaConfig);
    expect(cogaCss).toContain("--sg-hover-bg-shift: -0.05");
    expect(cogaCss).toContain("--sg-focus-bg-shift: -0.08");
    expect(cogaCss).toContain("--sg-active-bg-shift: -0.1");
  });
  test("no i18n CSS when i18n config is absent (zero overhead)", () => {
    const noI18nConfig = { brand: "#6366f1" };
    const noI18nCss = generateTokenCSS(noI18nConfig);
    expect(noI18nCss).not.toContain("--i18n-direction");
    expect(noI18nCss).not.toContain(":lang(ar)");
    expect(noI18nCss).not.toContain(":dir(rtl)");
    expect(noI18nCss).not.toContain(".icon-directional");
  });
  test("i18n CSS is emitted when i18n config is present", () => {
    const i18nConfig = {
      brand: "#6366f1",
      i18n: {
        supportedLocales: ["en", "ar", "ja", "ko"]
      }
    };
    const i18nCss = generateTokenCSS(i18nConfig);
    expect(i18nCss).toContain("--i18n-direction: 1;");
    expect(i18nCss).toContain("--i18n-direction: -1;");
    expect(i18nCss).toContain(":lang(ar)");
    expect(i18nCss).toContain(":lang(ja)");
    expect(i18nCss).toContain(":lang(ko)");
    expect(i18nCss).toContain(".icon-directional");
    expect(i18nCss).toContain("line-break: strict");
    expect(i18nCss).toContain("word-break: keep-all");
  });
  test("no icon tokens when icons config absent (zero overhead)", () => {
    const noIconConfig = { brand: "#6366f1" };
    const noIconCss = generateTokenCSS(noIconConfig);
    expect(noIconCss).not.toContain("--sg-icon-size-");
    expect(noIconCss).not.toContain("--sg-icon-stroke-");
  });
  test("icon tokens emitted when icons config present", () => {
    const iconConfig = {
      brand: "#6366f1",
      icons: {}
    };
    const iconCss = generateTokenCSS(iconConfig);
    expect(iconCss).toContain("--sg-icon-size-xs:");
    expect(iconCss).toContain("--sg-icon-size-default:");
    expect(iconCss).toContain("--sg-icon-size-xl:");
    expect(iconCss).toContain("--sg-icon-stroke-thin:");
    expect(iconCss).toContain("--sg-icon-stroke-default:");
    expect(iconCss).toContain("--sg-icon-stroke-bold:");
    expect(iconCss).toContain("--sg-icon-linecap: round");
    expect(iconCss).toContain("--sg-icon-linejoin: round");
    expect(iconCss).toContain("--sg-icon-color: currentColor");
    expect(iconCss).toContain("--sg-icon-color-success:");
    expect(iconCss).toContain("--sg-icon-color-warning:");
    expect(iconCss).toContain("--sg-icon-color-danger:");
    expect(iconCss).toContain("--sg-icon-color-info:");
    expect(iconCss).toContain("--sg-icon-opacity: 1");
    expect(iconCss).toContain("--sg-icon-fill-l-offset: 0");
  });
  test("icon dark mode compensation tokens", () => {
    const iconConfig = {
      brand: "#6366f1",
      icons: {}
    };
    const iconCss = generateTokenCSS(iconConfig);
    expect(iconCss).toContain("--sg-icon-opacity: 0.88");
    expect(iconCss).toContain("--sg-icon-fill-l-offset: -0.03");
    expect(iconCss).toContain("@media (min-resolution: 2dppx)");
    expect(iconCss).toContain("--sg-icon-opacity: 0.93");
    expect(iconCss).toContain("--sg-icon-fill-l-offset: -0.01");
  });
  test("icon geometric stroke profile", () => {
    const iconConfig = {
      brand: "#6366f1",
      icons: { strokeProfile: "geometric" }
    };
    const iconCss = generateTokenCSS(iconConfig);
    expect(iconCss).toContain("--sg-icon-linecap: square");
    expect(iconCss).toContain("--sg-icon-linejoin: miter");
  });
  test("delivery font emits font variant and opsz tokens", () => {
    const fontConfig = {
      brand: "#6366f1",
      icons: { delivery: "font" }
    };
    const fontCss = generateTokenCSS(fontConfig);
    expect(fontCss).toContain("--sg-icon-font-variant: outlined");
    expect(fontCss).toContain("--sg-icon-font-weight: 400");
    expect(fontCss).toContain("--sg-icon-font-grade: 0");
    expect(fontCss).toContain("--sg-icon-opsz-xs: 20");
    expect(fontCss).toContain("--sg-icon-opsz-sm: 20");
    expect(fontCss).toContain("--sg-icon-opsz-md: 20");
    expect(fontCss).toContain("--sg-icon-opsz-default: 24");
    expect(fontCss).toContain("--sg-icon-opsz-lg: 40");
    expect(fontCss).toContain("--sg-icon-opsz-xl: 48");
  });
  test("delivery inline-svg does NOT emit font tokens", () => {
    const svgConfig = {
      brand: "#6366f1",
      icons: { delivery: "inline-svg" }
    };
    const svgCss = generateTokenCSS(svgConfig);
    expect(svgCss).not.toContain("--sg-icon-font-variant");
    expect(svgCss).not.toContain("--sg-icon-opsz-");
  });
});
describe("generateBundleCSS", () => {
  const config = { brand: "#6366f1" };
  test("layer order includes sigui.reset first", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain("@layer sigui.reset, sigui.tokens, sigui.base,");
  });
  test("reset layer contains box-sizing: border-box", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain("@layer sigui.reset {");
    expect(css).toContain("box-sizing: border-box");
    expect(css).toContain("margin: 0");
    expect(css).toContain("padding: 0");
  });
  test("structural shield is present and unlayered", async () => {
    const css = await generateBundleCSS(config);
    const shieldIdx = css.indexOf(".sg-stack { display: flex");
    const lastLayerIdx = css.lastIndexOf("@layer sigui.");
    expect(shieldIdx).toBeGreaterThan(lastLayerIdx);
  });
  test("shield contains critical structural properties", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain(".sg-stack { display: flex; flex-direction: column; }");
    expect(css).toContain('.sg-stack[data-direction="horizontal"] { flex-direction: row; }');
    expect(css).toContain(".sg-button {");
    expect(css).toContain("padding: var(--sg-button-padding-y");
    expect(css).toContain(".sg-container { width: 100%; margin-inline: auto; }");
    expect(css).toContain(".sg-container[data-padding]");
    expect(css).toContain('.sg-card[data-padding="md"]');
    expect(css).toContain(".sg-grid { display: grid; }");
  });
  test("bundle without utilities omits sigui.utilities from layer order", async () => {
    const noUtilConfig = { brand: "#6366f1", utilities: false };
    const css = await generateBundleCSS(noUtilConfig);
    expect(css).toContain("@layer sigui.reset, sigui.tokens, sigui.base, sigui.variants, sigui.states, sigui.overrides;");
    expect(css).not.toContain("sigui.utilities");
  });
});
describe("typed/json token output parity", () => {
  const config = { brand: "#6366f1" };
  test("TypeScript output includes token groups that JSON output emits", () => {
    const ts = generateTypeScriptTokens(config);
    const json = JSON.parse(generateJSONTokens(config));
    expect(ts).toContain("export const border = {");
    expect(ts).toContain("export const measures = {");
    expect(ts).toContain("export const interactive = {");
    for (const name of Object.keys(getBorderScale())) {
      expect(Object.hasOwn(json, `border.${name}`)).toBe(true);
      expect(ts).toContain(`${name}: "${json[`border.${name}`]}",`);
    }
    for (const [name, value] of Object.entries(measureTokens())) {
      expect(Object.hasOwn(json, `typography.measure.${name}`)).toBe(true);
      expect(ts).toContain(`${name}: "${value}",`);
    }
    expect(Object.hasOwn(json, "interactive.focusColor")).toBe(true);
    expect(Object.hasOwn(json, "interactive.focusWidth")).toBe(true);
    expect(Object.hasOwn(json, "interactive.focusOffset")).toBe(true);
    expect(Object.hasOwn(json, "interactive.hoverOpacity")).toBe(true);
    expect(Object.hasOwn(json, "interactive.focusOpacity")).toBe(true);
    expect(Object.hasOwn(json, "interactive.activeOpacity")).toBe(true);
    expect(Object.hasOwn(json, "interactive.touchMin")).toBe(true);
    expect(ts).toContain(`focusColor: "${json["interactive.focusColor"]}",`);
    expect(ts).toContain(`focusWidth: "${json["interactive.focusWidth"]}",`);
    expect(ts).toContain(`focusOffset: "${json["interactive.focusOffset"]}",`);
    expect(ts).toContain(`hoverOpacity: ${json["interactive.hoverOpacity"]},`);
    expect(ts).toContain(`focusOpacity: ${json["interactive.focusOpacity"]},`);
    expect(ts).toContain(`activeOpacity: ${json["interactive.activeOpacity"]},`);
    expect(ts).toContain(`touchMin: "${json["interactive.touchMin"]}",`);
  });
});
