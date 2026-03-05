// @ts-check

/**
 * Repository module for build aesthetics.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import { generateTokenCSS } from "../src/generators/css.js";
const BASE = { brand: "#6366f1" };
describe("CSS appearance", () => {
  test("auto (default) emits both prefers-color-scheme and data-theme blocks", () => {
    const css = generateTokenCSS(BASE);
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain('[data-theme="dark"]');
  });
  test("light appearance omits dark mode blocks", () => {
    const css = generateTokenCSS({ ...BASE, appearance: "light" });
    expect(css).not.toContain("@media (prefers-color-scheme: dark)");
    expect(css).not.toContain('[data-theme="dark"]');
  });
  test("dark appearance emits forced dark mode without media query", () => {
    const css = generateTokenCSS({ ...BASE, appearance: "dark" });
    expect(css).toContain("color-scheme: dark;");
    expect(css).not.toContain("prefers-color-scheme: dark");
    expect(css).not.toContain('[data-theme="dark"]');
  });
});
describe("CSS shape", () => {
  test("default (rounded) does not emit squircle @supports", () => {
    const css = generateTokenCSS(BASE);
    expect(css).not.toContain("--sg-corner-shape: squircle");
    expect(css).toContain("--sg-corner-shape: round");
  });
  test("squircle shape emits @supports (corner-shape: squircle) block", () => {
    const css = generateTokenCSS({ ...BASE, shape: "squircle" });
    expect(css).toContain("@supports (corner-shape: squircle)");
    expect(css).toContain("--sg-corner-shape: squircle");
    expect(css).toContain("corner-shape: squircle");
  });
  test("sharp shape produces small radii", () => {
    const css = generateTokenCSS({ ...BASE, shape: "sharp" });
    expect(css).toContain("--sg-radius-sm: 0;");
    expect(css).toContain("--sg-radius-md: 0.125rem;");
  });
  test("pill shape produces 9999px radii", () => {
    const css = generateTokenCSS({ ...BASE, shape: "pill" });
    expect(css).toContain("--sg-radius-sm: 9999px;");
    expect(css).toContain("--sg-radius-md: 9999px;");
  });
});
describe("CSS depth", () => {
  test("flat depth emits border-only surface styles", () => {
    const css = generateTokenCSS({ ...BASE, depth: "flat" });
    expect(css).toContain("/* Flat depth: surfaces use borders instead of shadows */");
    expect(css).toContain("border: var(--sg-border-thin, 1px) solid var(--sg-color-border)");
  });
  test("medium depth (default) does NOT emit flat border styles", () => {
    const css = generateTokenCSS(BASE);
    expect(css).not.toContain("Flat depth");
  });
});
describe("CSS density", () => {
  test("default density sets --sg-density: 1", () => {
    const css = generateTokenCSS(BASE);
    expect(css).toContain("--sg-density: 1;");
  });
  test("compact density sets --sg-density: 0.75", () => {
    const css = generateTokenCSS({ ...BASE, density: "compact" });
    expect(css).toContain("--sg-density: 0.75;");
  });
  test("spacious density sets --sg-density: 1.5", () => {
    const css = generateTokenCSS({ ...BASE, density: "spacious" });
    expect(css).toContain("--sg-density: 1.5;");
  });
  test("custom density factor", () => {
    const css = generateTokenCSS({
      ...BASE,
      density: { preset: "comfortable", factor: 1.1 }
    });
    expect(css).toContain("--sg-density: var(--sg-adaptive-density, 1.1);");
  });
  test("density attribute selectors are always emitted", () => {
    const css = generateTokenCSS(BASE);
    expect(css).toContain('[data-density="compact"]');
    expect(css).toContain('[data-density="spacious"]');
  });
});
describe("CSS motion", () => {
  test("snappy motion halves duration tokens", () => {
    const css = generateTokenCSS({ ...BASE, motion: "snappy" });
    expect(css).toContain("--sg-duration-normal: calc(var(--sg-duration-normal-base) * var(--sg-duration-scalar));");
    expect(css).toContain("--sg-duration-scalar: 0.5;");
  });
  test("instant motion near-zeros duration tokens", () => {
    const css = generateTokenCSS({ ...BASE, motion: "instant" });
    expect(css).toContain("--sg-duration-normal: calc(var(--sg-duration-normal-base) * var(--sg-duration-scalar));");
    expect(css).toContain("--sg-duration-scalar: 0.05;");
  });
  test("playful motion scales durations up", () => {
    const css = generateTokenCSS({ ...BASE, motion: "playful" });
    expect(css).toContain("--sg-duration-normal: calc(var(--sg-duration-normal-base) * var(--sg-duration-scalar));");
    expect(css).toContain("--sg-duration-scalar: 1.3;");
  });
  test("default (smooth) keeps original durations", () => {
    const css = generateTokenCSS(BASE);
    expect(css).toContain("--sg-duration-normal: calc(var(--sg-duration-normal-base) * var(--sg-duration-scalar));");
    expect(css).toContain("--sg-duration-scalar: 1;");
  });
});
