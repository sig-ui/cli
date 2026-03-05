// @ts-check

/**
 * Repository module for bundle.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import { generateBundleCSS } from "../src/generators/bundle.js";
describe("generateBundleCSS", () => {
  const config = { brand: "#6366f1" };
  test("starts with layer ordering declaration", async () => {
    const css = await generateBundleCSS(config);
    const lines = css.split(`
`);
    expect(lines[1]).toBe("@layer sigui.reset, sigui.tokens, sigui.base, sigui.variants, sigui.states, sigui.utilities, sigui.overrides;");
  });
  test("includes token CSS in sigui.tokens layer", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain("@layer sigui.tokens {");
    expect(css).toContain("--sg-color-primary:");
    expect(css).toContain("--sg-font-family:");
    expect(css).toContain("--sg-space-4:");
    expect(css).toContain("--sg-shadow-md:");
    expect(css).toContain("--sg-duration-fast:");
  });
  test("includes base component styles", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain("@layer sigui.base {");
    expect(css).toContain(".sg-button");
    expect(css).toContain(".sg-card");
    expect(css).toContain(".sg-input");
    expect(css).toContain(".sg-checkbox");
    expect(css).toContain(".sg-dialog");
  });
  test("includes variant styles", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain("@layer sigui.variants {");
    expect(css).toContain('[data-size="sm"]');
    expect(css).toContain('[data-color="primary"]');
    expect(css).toContain('[data-elevation="3"]');
  });
  test("includes state styles", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain("@layer sigui.states {");
    expect(css).toContain("[data-disabled]");
    expect(css).toContain("[data-loading]");
    expect(css).toContain('[data-state="active"]');
    expect(css).toContain(':checked');
  });
  test("includes OKLCH support block", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain("@supports (color: oklch(0 0 0))");
  });
  test("includes dark mode overrides", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain("@media (prefers-color-scheme: dark)");
  });
  test("all layers are present", async () => {
    const css = await generateBundleCSS(config);
    const tokensIdx = css.indexOf("@layer sigui.tokens {");
    const baseIdx = css.indexOf("@layer sigui.base {");
    const variantsIdx = css.indexOf("@layer sigui.variants {");
    const statesIdx = css.indexOf("@layer sigui.states {");
    const utilitiesIdx = css.indexOf("@layer sigui.utilities {");
    expect(tokensIdx).toBeGreaterThan(-1);
    expect(baseIdx).toBeGreaterThan(tokensIdx);
    expect(variantsIdx).toBeGreaterThan(-1);
    expect(statesIdx).toBeGreaterThan(-1);
    expect(utilitiesIdx).toBeGreaterThan(-1);
  });
  test("includes utility classes", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain("@layer sigui.utilities {");
    expect(css).toContain(".sg-p-related");
    expect(css).toContain(".sg-m-auto");
    expect(css).toContain(".sg-text-xs");
    expect(css).toContain(".sg-font-bold");
    expect(css).toContain(".sg-truncate");
    expect(css).toContain(".sg-sr-only");
    expect(css).toContain(".sg-hidden");
  });
  test("includes animation styles", async () => {
    const css = await generateBundleCSS(config);
    expect(css).toContain("@keyframes sg-fade-in");
    expect(css).toContain(".sg-scroll-reveal-fade");
    expect(css).toContain(".sg-scroll-progress");
    expect(css).toContain("prefers-reduced-motion");
  });
  test("omits utilities when config.utilities is false", async () => {
    const noUtilConfig = { brand: "#6366f1", utilities: false };
    const css = await generateBundleCSS(noUtilConfig);
    expect(css).not.toContain("@layer sigui.utilities {");
    expect(css).not.toContain("sigui.utilities,");
    expect(css).toContain("@keyframes sg-fade-in");
  });
});
