// @ts-check

/**
 * Repository module for split css.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import { generateSplitCSS } from "../src/generators/split-css.js";
describe("generateSplitCSS", () => {
  const config = {
    brand: "#6366f1",
    brands: {
      "acme-pro": {
        displayName: "Acme Pro",
        semanticOverrides: {
          "color.action.primary": "var(--brand-600)"
        }
      },
      "acme-lite": {
        displayName: "Acme Lite",
        componentOverrides: {
          "button.radius": "9999px"
        }
      }
    }
  };
  const result = generateSplitCSS(config);
  test("returns all expected file keys", () => {
    expect(result.primitives).toBeDefined();
    expect(result.semanticLight).toBeDefined();
    expect(result.semanticDark).toBeDefined();
    expect(result.brands).toBeDefined();
    expect(result.densities).toBeDefined();
    expect(result.components).toBeDefined();
    expect(result.highContrast).toBeDefined();
    expect(result.reducedTransparency).toBeDefined();
    expect(result.all).toBeDefined();
  });
  test("primitives contain color palette vars", () => {
    expect(result.primitives).toContain("--brand-500:");
    expect(result.primitives).toContain("--brand-50:");
    expect(result.primitives).toContain("--brand-950:");
    expect(result.primitives).toContain("--danger-500:");
  });
  test("primitives contain spacing tokens", () => {
    expect(result.primitives).toContain("--sg-space-4:");
  });
  test("primitives contain typography tokens", () => {
    expect(result.primitives).toContain("--sg-font-family:");
    expect(result.primitives).toContain("--sg-text-base:");
  });
  test("semantic light contains color mappings", () => {
    expect(result.semanticLight).toContain("--sg-color-primary: var(--brand-500)");
    expect(result.semanticLight).toContain("--sg-color-text:");
    expect(result.semanticLight).toContain("--sg-bg:");
    expect(result.semanticLight).toContain("--sg-gap-micro:");
    expect(result.semanticLight).toContain("--sg-gap-tight:");
  });
  test("semantic dark wraps in @media (prefers-color-scheme: dark)", () => {
    expect(result.semanticDark).toContain("@media (prefers-color-scheme: dark)");
    expect(result.semanticDark).toContain("--sg-color-primary: var(--brand-400)");
  });
  test("brand files use [data-brand] selector", () => {
    expect(result.brands["acme-pro"]).toContain('[data-brand="acme-pro"]');
    expect(result.brands["acme-pro"]).toContain("--sg-color-action");
    expect(result.brands["acme-lite"]).toContain('[data-brand="acme-lite"]');
    expect(result.brands["acme-lite"]).toContain("--sg-button-radius:");
  });
  test("density files use [data-density] selector", () => {
    expect(result.densities["compact"]).toContain('[data-density="compact"]');
    expect(result.densities["compact"]).toContain("0.75");
    expect(result.densities["comfortable"]).toContain('[data-density="comfortable"]');
    expect(result.densities["spacious"]).toContain('[data-density="spacious"]');
    expect(result.densities["spacious"]).toContain("1.5");
  });
  test("components contains component tokens", () => {
    expect(result.components).toContain("--sg-button-bg:");
    expect(result.components).toContain("--sg-input-bg:");
    expect(result.components).toContain("--sg-card-bg:");
  });
  test("components include depth-based relationship utility selectors", () => {
    expect(result.components).toContain('[data-depth="0"] { --sg-gap-by-depth: var(--sg-gap-distinct); }');
    expect(result.components).toContain('[data-depth="1"] { --sg-gap-by-depth: var(--sg-gap-separated); }');
    expect(result.components).toContain(".sg-gap-auto { gap: var(--sg-gap-by-depth, var(--sg-gap-grouped)); }");
  });
  test("high contrast contains @media (prefers-contrast: high)", () => {
    expect(result.highContrast).toContain("@media (prefers-contrast: high)");
    expect(result.highContrast).toContain("--sg-focus-width: 3px");
  });
  test("high contrast has correct opacity values", () => {
    expect(result.highContrast).toContain("--sg-state-hover-opacity: 0.12");
    expect(result.highContrast).toContain("--sg-state-focus-opacity: 0.16");
    expect(result.highContrast).toContain("--sg-state-active-opacity: 0.16");
    expect(result.highContrast).toContain("--sg-border-width: 2px");
    expect(result.highContrast).toContain("--sg-glass-opacity: 1");
  });
  test("all.css contains @import directives", () => {
    expect(result.all).toContain('@import "primitives.css"');
    expect(result.all).toContain('@import "semantic-light.css"');
    expect(result.all).toContain('@import "semantic-dark.css"');
    expect(result.all).toContain('@import "components.css"');
    expect(result.all).toContain('@import "high-contrast.css"');
    expect(result.all).toContain('@import "brand-acme-pro.css"');
    expect(result.all).toContain('@import "brand-acme-lite.css"');
    expect(result.all).toContain('@import "density-compact.css"');
  });
  test("reducedTransparency is empty string when no COGA config", () => {
    expect(result.reducedTransparency).toBe("");
  });
  test("reducedTransparency contains media query when COGA present", () => {
    const cogaConfig = {
      brand: "#6366f1",
      cognitiveAccessibility: {}
    };
    const cogaResult = generateSplitCSS(cogaConfig);
    expect(cogaResult.reducedTransparency).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(cogaResult.reducedTransparency).toContain("--sg-glass-opacity: 1");
    expect(cogaResult.reducedTransparency).toContain("--sg-hover-bg-shift: -0.04");
  });
  test("manifest includes reduced-transparency import when COGA present", () => {
    const cogaConfig = {
      brand: "#6366f1",
      cognitiveAccessibility: {}
    };
    const cogaResult = generateSplitCSS(cogaConfig);
    expect(cogaResult.all).toContain('@import "reduced-transparency.css"');
  });
  test("manifest excludes reduced-transparency import when COGA absent", () => {
    expect(result.all).not.toContain("reduced-transparency");
  });
  test("no brands produces empty brands record", () => {
    const noBrands = { brand: "#6366f1" };
    const noBrandResult = generateSplitCSS(noBrands);
    expect(Object.keys(noBrandResult.brands)).toHaveLength(0);
  });
});
