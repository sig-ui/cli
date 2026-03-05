// @ts-check

/**
 * Repository module for phase4.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import { checkTokenContracts } from "../../src/checks/phase4.js";
describe("Phase 4: Component Composition Audit", () => {
  describe("checkTokenContracts", () => {
    test("CSS with all expected tokens passes", () => {
      const css = `
:root {
  --sg-color-primary: #6366f1;
  --sg-color-secondary: #a855f7;
  --sg-color-danger: #ef4444;
  --sg-color-success: #22c55e;
  --sg-color-warning: #eab308;
  --sg-color-info: #3b82f6;
  --sg-base-unit: 0.25rem;
  --sg-space-1: calc(1 * var(--sg-base-unit));
  --sg-space-2: calc(2 * var(--sg-base-unit));
  --sg-space-4: calc(4 * var(--sg-base-unit));
}`;
      const diags = checkTokenContracts(css);
      const errors = diags.filter((d) => d.severity === "error");
      expect(errors.length).toBe(0);
    });
    test("missing token patterns produce warnings", () => {
      const css = ":root { --x: 1; }";
      const diags = checkTokenContracts(css);
      const warnings = diags.filter((d) => d.severity === "warning");
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.every((d) => d.rule === "tokens/contract")).toBe(true);
    });
    test("all diagnostics are phase component", () => {
      const css = ":root { --sg-color-primary: red; --sg-space-1: 1px; }";
      const diags = checkTokenContracts(css);
      expect(diags.every((d) => d.phase === "component")).toBe(true);
    });
  });
});
