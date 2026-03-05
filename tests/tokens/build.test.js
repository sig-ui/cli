// @ts-check

/**
 * Repository module for build.test.
 * @module
 */
import { describe, test, expect } from "bun:test";
import { buildCSS, buildJSON, buildTypeScript } from "../../src/tokens/build.js";
const sampleTree = {
  color: {
    $type: "color",
    brand: {
      "500": {
        $value: "oklch(0.55 0.15 250)",
        $type: "color",
        $extensions: { "com.sigui": { srgbFallback: "#6366f1", gamut: "p3" } }
      },
      "600": {
        $value: "oklch(0.46 0.14 250)",
        $type: "color",
        $extensions: { "com.sigui": { srgbFallback: "#4f46e5", gamut: "p3" } }
      }
    },
    action: {
      primary: { $value: "{color.brand.500}", $type: "color" }
    }
  },
  space: {
    $type: "dimension",
    "2": { $value: "0.5rem" },
    "4": { $value: "1rem" }
  },
  duration: {
    $type: "duration",
    fast: { $value: "100ms" },
    normal: { $value: "200ms" }
  },
  easing: {
    $type: "cubicBezier",
    default: { $value: [0.2, 0, 0, 1] }
  }
};
describe("buildCSS", () => {
  test("output contains :root block", () => {
    const css = buildCSS(sampleTree);
    expect(css).toContain(":root {");
  });
  test("output contains CSS custom properties", () => {
    const css = buildCSS(sampleTree);
    expect(css).toContain("--color-brand-500:");
    expect(css).toContain("--space-2:");
    expect(css).toContain("--space-4:");
    expect(css).toContain("--duration-fast:");
  });
  test("alias tokens become var() references", () => {
    const css = buildCSS(sampleTree);
    expect(css).toContain("--color-action-primary: var(--color-brand-500)");
  });
  test("OKLCH color tokens use srgbFallback in base tier", () => {
    const css = buildCSS(sampleTree);
    expect(css).toContain("--color-brand-500: #6366f1");
  });
  test("output contains @supports block for OKLCH", () => {
    const css = buildCSS(sampleTree);
    expect(css).toContain("@supports (color: oklch(0 0 0))");
    expect(css).toContain("--color-brand-500: oklch(0.55 0.15 250)");
  });
  test("cubicBezier tokens become cubic-bezier() values", () => {
    const css = buildCSS(sampleTree);
    expect(css).toContain("cubic-bezier(0.2, 0, 0, 1)");
  });
  test("custom prefix is applied to property names", () => {
    const css = buildCSS(sampleTree, { prefix: "sg" });
    expect(css).toContain("--sg-color-brand-500:");
    expect(css).toContain("--sg-space-4:");
  });
  test("custom selector is used instead of :root", () => {
    const css = buildCSS(sampleTree, { selector: ".theme" });
    expect(css).toContain(".theme {");
    expect(css).not.toContain(":root {");
  });
  test("dark mode block is emitted when darkModeTokens provided", () => {
    const css = buildCSS(sampleTree, {
      darkModeTokens: {
        "color.action.primary": "{color.brand.600}"
      }
    });
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("--color-action-primary: var(--color-brand-600)");
  });
  test("density variant block uses data-density selector", () => {
    const css = buildCSS(sampleTree, {
      densityVariants: {
        compact: { "space.4": "calc(1rem * 0.75)" }
      }
    });
    expect(css).toContain('[data-density="compact"]');
    expect(css).toContain("--density: 0.75");
    expect(css).toContain("--space-4: calc(1rem * 0.75)");
  });
  test("spacious density variant is included", () => {
    const css = buildCSS(sampleTree, {
      densityVariants: {
        spacious: { "space.4": "calc(1rem * 1.5)" }
      }
    });
    expect(css).toContain('[data-density="spacious"]');
    expect(css).toContain("--density: 1.5");
  });
  test("non-OKLCH color values appear only in base block", () => {
    const tree = {
      color: {
        bg: { $value: "#ffffff", $type: "color" }
      }
    };
    const css = buildCSS(tree);
    expect(css).toContain("--color-bg: #ffffff");
    const supportsIndex = css.indexOf("@supports");
    if (supportsIndex !== -1) {
      const supportsBlock = css.slice(supportsIndex);
      expect(supportsBlock).not.toContain("--color-bg");
    }
  });
});
describe("buildJSON", () => {
  test("output is valid JSON", () => {
    const json = buildJSON(sampleTree);
    expect(() => JSON.parse(json)).not.toThrow();
  });
  test("output is a flat key-value object", () => {
    const json = buildJSON(sampleTree);
    const parsed = JSON.parse(json);
    for (const value of Object.values(parsed)) {
      const isPrimitive = typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value) || typeof value === "object" && value !== null && !("value" in value);
      expect(isPrimitive).toBe(true);
    }
  });
  test("output includes all token paths", () => {
    const json = buildJSON(sampleTree);
    const parsed = JSON.parse(json);
    expect("color.brand.500" in parsed).toBe(true);
    expect("space.2" in parsed).toBe(true);
    expect("duration.fast" in parsed).toBe(true);
  });
  test("aliases are resolved to final values by default", () => {
    const json = buildJSON(sampleTree);
    const parsed = JSON.parse(json);
    expect(parsed["color.action.primary"]).toBe("oklch(0.55 0.15 250)");
  });
  test("resolve: false preserves alias strings", () => {
    const json = buildJSON(sampleTree, { resolve: false });
    const parsed = JSON.parse(json);
    expect(parsed["color.action.primary"]).toBe("{color.brand.500}");
  });
  test("include filter limits output paths", () => {
    const json = buildJSON(sampleTree, { include: ["color"] });
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed).every((k) => k.startsWith("color"))).toBe(true);
    expect("space.4" in parsed).toBe(false);
  });
  test("output is pretty-printed (contains newlines)", () => {
    const json = buildJSON(sampleTree);
    expect(json.includes(`
`)).toBe(true);
  });
});
describe("buildTypeScript", () => {
  test("output is a non-empty string", () => {
    const ts = buildTypeScript(sampleTree);
    expect(typeof ts).toBe("string");
    expect(ts.length).toBeGreaterThan(0);
  });
  test("named export style produces export const declarations", () => {
    const ts = buildTypeScript(sampleTree, { exportStyle: "named" });
    expect(ts).toContain("export const");
    expect(ts).toContain("as const;");
  });
  test("object export style produces a single tokens object", () => {
    const ts = buildTypeScript(sampleTree, { exportStyle: "object" });
    expect(ts).toContain("export const tokens = {");
    expect(ts).toContain("} as const;");
    expect(ts).toContain("export type TokenKey");
    expect(ts).toContain("export type TokenValue");
  });
  test("output contains JSDoc comment for each token (named style)", () => {
    const ts = buildTypeScript(sampleTree, { exportStyle: "named" });
    expect(ts).toContain("/** Token:");
  });
  test("token identifiers are valid JS identifiers (named style)", () => {
    const ts = buildTypeScript(sampleTree, { exportStyle: "named" });
    const matches = ts.matchAll(/export const (\w+) =/g);
    for (const [, ident] of matches) {
      expect(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(ident)).toBe(true);
    }
  });
  test("aliases are resolved in TypeScript output", () => {
    const ts = buildTypeScript(sampleTree, { exportStyle: "named" });
    expect(ts).not.toContain("{color.brand.500}");
  });
  test("custom module doc is included at the top", () => {
    const ts = buildTypeScript(sampleTree, {
      moduleDoc: "My custom design tokens"
    });
    expect(ts).toContain("My custom design tokens");
  });
  test("arrays are serialized correctly (cubicBezier)", () => {
    const ts = buildTypeScript(sampleTree, { exportStyle: "named" });
    expect(ts).toContain("[0.2, 0, 0, 1]");
  });
  test("output ends with a newline", () => {
    const ts = buildTypeScript(sampleTree);
    expect(ts.endsWith(`
`)).toBe(true);
  });
});
