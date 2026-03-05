// @ts-check

/**
 * Repository module for config.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import { mergeWithDefaults } from "@sig-ui/theme";
import { DEFAULT_CONFIG } from "@sig-ui/theme";
describe("config", () => {
  test("mergeWithDefaults fills in missing values", () => {
    const raw = { brand: "#6366f1" };
    const merged = mergeWithDefaults(raw);
    expect(merged.brand).toBe("#6366f1");
    expect(merged.typography?.base).toBe(16);
    expect(merged.typography?.ratio).toBe(1.2);
    expect(merged.spacing?.baseUnit).toBe(4);
    expect(merged.output?.dir).toBe("src/sigui");
  });
  test("mergeWithDefaults respects overrides", () => {
    const raw = {
      brand: "#ff0000",
      typography: { base: 18, ratio: 1.333 },
      spacing: { baseUnit: 8 },
      output: { dir: "lib/tokens" }
    };
    const merged = mergeWithDefaults(raw);
    expect(merged.typography?.base).toBe(18);
    expect(merged.typography?.ratio).toBe(1.333);
    expect(merged.spacing?.baseUnit).toBe(8);
    expect(merged.output?.dir).toBe("lib/tokens");
    expect(merged.typography?.fontFamily).toBe(DEFAULT_CONFIG.typography.fontFamily);
  });
  test("default roles are provided", () => {
    const raw = { brand: "#6366f1" };
    const merged = mergeWithDefaults(raw);
    expect(merged.roles?.danger).toBe("#be123c");
    expect(merged.roles?.success).toBe("#16a34a");
    expect(merged.roles?.warning).toBe("#d97706");
    expect(merged.roles?.info).toBe("#2563eb");
  });
  test("custom roles merge with defaults", () => {
    const raw = {
      brand: "#6366f1",
      roles: { danger: "#ff0000" }
    };
    const merged = mergeWithDefaults(raw);
    expect(merged.roles?.danger).toBe("#ff0000");
    expect(merged.roles?.success).toBe("#16a34a");
  });
  test("fluidTokens defaults are provided when not specified", () => {
    const raw = { brand: "#6366f1" };
    const merged = mergeWithDefaults(raw);
    expect(merged.fluidTokens?.enabled).toBe(true);
    expect(merged.fluidTokens?.minViewport).toBe(320);
    expect(merged.fluidTokens?.maxViewport).toBe(1440);
    expect(merged.fluidTokens?.fluidEasing).toBe("ease-out");
  });
  test("fluidTokens config merges with defaults", () => {
    const raw = {
      brand: "#6366f1",
      fluidTokens: { enabled: true, minViewport: 400 }
    };
    const merged = mergeWithDefaults(raw);
    expect(merged.fluidTokens?.enabled).toBe(true);
    expect(merged.fluidTokens?.minViewport).toBe(400);
    expect(merged.fluidTokens?.maxViewport).toBe(1440);
    expect(merged.fluidTokens?.fluidEasing).toBe("ease-out");
  });
  test("brands are passed through", () => {
    const raw = {
      brand: "#6366f1",
      brands: {
        "acme-pro": {
          displayName: "Acme Pro",
          semanticOverrides: { "color.action.primary": "#ff0000" }
        }
      }
    };
    const merged = mergeWithDefaults(raw);
    expect(merged.brands).toBeDefined();
    expect(merged.brands?.["acme-pro"]?.displayName).toBe("Acme Pro");
  });
  test("splitFiles defaults to false", () => {
    const raw = { brand: "#6366f1" };
    const merged = mergeWithDefaults(raw);
    expect(merged.output?.splitFiles).toBe(false);
  });
  test("splitFiles can be enabled", () => {
    const raw = {
      brand: "#6366f1",
      output: { splitFiles: true }
    };
    const merged = mergeWithDefaults(raw);
    expect(merged.output?.splitFiles).toBe(true);
  });
  test("missing new fields produce backwards-compatible defaults", () => {
    const raw = { brand: "#6366f1" };
    const merged = mergeWithDefaults(raw);
    expect(merged.brands).toBeUndefined();
    expect(merged.fluidTokens?.enabled).toBe(true);
    expect(merged.output?.splitFiles).toBe(false);
  });
  test("cognitiveAccessibility is undefined when not specified (zero overhead)", () => {
    const raw = { brand: "#6366f1" };
    const merged = mergeWithDefaults(raw);
    expect(merged.cognitiveAccessibility).toBeUndefined();
  });
  test("cognitiveAccessibility defaults are merged when key is present", () => {
    const raw = {
      brand: "#6366f1",
      cognitiveAccessibility: {}
    };
    const merged = mergeWithDefaults(raw);
    expect(merged.cognitiveAccessibility).toBeDefined();
    expect(merged.cognitiveAccessibility?.highContrast?.stateLayerOpacityBoost).toBe(0.04);
    expect(merged.cognitiveAccessibility?.highContrast?.disabledOpacity).toBe(0.5);
    expect(merged.cognitiveAccessibility?.reducedTransparency?.lightnessShiftHover).toBe(-0.04);
    expect(merged.cognitiveAccessibility?.reducedTransparency?.lightnessShiftFocus).toBe(-0.06);
    expect(merged.cognitiveAccessibility?.errorPrevention?.undoWindowSeconds).toBe(8);
    expect(merged.cognitiveAccessibility?.session?.timeoutWarningSeconds).toBe(120);
    expect(merged.cognitiveAccessibility?.loading?.skeletonAppearDelayMs).toBe(200);
    expect(merged.cognitiveAccessibility?.content?.maxReadingLevel).toBe(8);
    expect(merged.cognitiveAccessibility?.cognitiveLoad?.maxInteractivePerSection).toBe(7);
    expect(merged.cognitiveAccessibility?.defaultDensityForAccessibility).toBe("comfortable");
  });
  test("cognitiveAccessibility overrides merge with defaults", () => {
    const raw = {
      brand: "#6366f1",
      cognitiveAccessibility: {
        defaultDensityForAccessibility: "spacious",
        reducedTransparency: { lightnessShiftHover: -0.05 },
        cognitiveLoad: { maxNavItems: 5 }
      }
    };
    const merged = mergeWithDefaults(raw);
    expect(merged.cognitiveAccessibility?.defaultDensityForAccessibility).toBe("spacious");
    expect(merged.cognitiveAccessibility?.reducedTransparency?.lightnessShiftHover).toBe(-0.05);
    expect(merged.cognitiveAccessibility?.reducedTransparency?.lightnessShiftFocus).toBe(-0.06);
    expect(merged.cognitiveAccessibility?.cognitiveLoad?.maxNavItems).toBe(5);
    expect(merged.cognitiveAccessibility?.cognitiveLoad?.maxInteractivePerSection).toBe(7);
  });
  test("i18n is undefined when not specified (zero overhead)", () => {
    const raw = { brand: "#6366f1" };
    const merged = mergeWithDefaults(raw);
    expect(merged.i18n).toBeUndefined();
  });
  test("i18n defaults are merged when i18n key is present", () => {
    const raw = {
      brand: "#6366f1",
      i18n: { supportedLocales: ["en", "ar", "ja"] }
    };
    const merged = mergeWithDefaults(raw);
    expect(merged.i18n).toBeDefined();
    expect(merged.i18n?.defaultLocale).toBe("en");
    expect(merged.i18n?.defaultDirection).toBe("ltr");
    expect(merged.i18n?.supportedLocales).toEqual(["en", "ar", "ja"]);
    expect(merged.i18n?.rtl?.mirrorIcons).toBe(true);
    expect(merged.i18n?.cjk?.punctuationTrim).toBe(true);
    expect(merged.i18n?.pseudoLocalization?.enabled).toBe(false);
    expect(merged.i18n?.fontLoading?.strategy).toBe("swap");
  });
  test("i18n overrides merge with defaults", () => {
    const raw = {
      brand: "#6366f1",
      i18n: {
        defaultLocale: "ar",
        defaultDirection: "rtl",
        rtl: { mirrorIcons: false },
        cjk: { punctuationTrim: false }
      }
    };
    const merged = mergeWithDefaults(raw);
    expect(merged.i18n?.defaultLocale).toBe("ar");
    expect(merged.i18n?.defaultDirection).toBe("rtl");
    expect(merged.i18n?.rtl?.mirrorIcons).toBe(false);
    expect(merged.i18n?.rtl?.mirrorMotion).toBe(true);
    expect(merged.i18n?.cjk?.punctuationTrim).toBe(false);
    expect(merged.i18n?.cjk?.fontLoading).toBe("unicode-range");
  });
});
