// @ts-check

/**
 * Repository module for phase3.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import {
  checkCSSLint,
  checkBundleSize,
  checkPrimitiveTokenLeak
} from "../../src/checks/phase3.js";
import { mergeWithDefaults } from "@sig-ui/theme";
function makeConfig(overrides = {}) {
  return mergeWithDefaults({ brand: "#6366f1", ...overrides });
}
describe("Phase 3: CSS Output Audit", () => {
  describe("checkCSSLint", () => {
    test("clean CSS produces no diagnostics", () => {
      const css = `
@layer sigui.tokens {
  :root {
    --sg-color-primary: #6366f1;
  }
}
.button {
  background: var(--sg-color-primary);
  transition: background-color 200ms ease;
}`;
      const diags = checkCSSLint(css);
      expect(diags.filter((d) => d.severity === "error").length).toBe(0);
    });
    test("@import produces error", () => {
      const css = `@import url("other.css");
.button { color: red; }`;
      const diags = checkCSSLint(css);
      const importErr = diags.find((d) => d.rule.includes("no-import"));
      expect(importErr).toBeDefined();
      expect(importErr.severity).toBe("error");
    });
    test("all diagnostics are phase css", () => {
      const css = `@import url("x.css");
* { transition: all 300ms; }`;
      const diags = checkCSSLint(css);
      expect(diags.every((d) => d.phase === "css")).toBe(true);
    });
  });
  describe("checkBundleSize", () => {
    test("small CSS is under budget", () => {
      const config = makeConfig();
      const css = ":root { --x: 1; }";
      const diags = checkBundleSize(css, config);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe("info");
      expect(diags[0].rule).toBe("perf/css-bundle-size");
    });
    test("oversized CSS exceeds budget", () => {
      const config = makeConfig();
      config.performance = { css: { maxTotalGzipped: 1 } };
      const css = ":root { --x: 1; }";
      const diags = checkBundleSize(css, config);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe("error");
      expect(diags[0].message).toContain("exceeds");
    });
  });
  describe("checkPrimitiveTokenLeak", () => {
    test("no leaks in clean CSS", () => {
      const css = `
:root {
  --brand-500: #6366f1;
  --sg-color-primary: var(--brand-500);
}
.button {
  background: var(--sg-color-primary);
}`;
      const diags = checkPrimitiveTokenLeak(css);
      expect(diags.length).toBe(0);
    });
    test("detects primitive token in component selector", () => {
      const css = `
:root {
  --brand-500: #6366f1;
}
.button {
  background: var(--brand-500);
}`;
      const diags = checkPrimitiveTokenLeak(css);
      expect(diags.length).toBeGreaterThan(0);
      expect(diags[0].severity).toBe("warning");
      expect(diags[0].rule).toBe("tokens/primitive-leak");
    });
    test("primitive token in :root is acceptable", () => {
      const css = `
:root {
  --sg-color-primary: var(--brand-500);
  --sg-color-danger: var(--danger-500);
}`;
      const diags = checkPrimitiveTokenLeak(css);
      expect(diags.length).toBe(0);
    });
    test("primitive token in [data-theme] is acceptable", () => {
      const css = `
[data-theme="dark"] {
  --sg-color-primary: var(--brand-400);
}`;
      const diags = checkPrimitiveTokenLeak(css);
      expect(diags.length).toBe(0);
    });
    test("primitive token in [data-brand] is acceptable", () => {
      const css = `
[data-brand="acme"] {
  --sg-color-primary: var(--brand-600);
}`;
      const diags = checkPrimitiveTokenLeak(css);
      expect(diags.length).toBe(0);
    });
  });
});
