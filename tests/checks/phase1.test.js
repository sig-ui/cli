// @ts-check

/**
 * Repository module for phase1.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import { mergeWithDefaults } from "@sig-ui/theme";
import {
  checkBrandColor,
  checkRoleColors,
  checkBrandChains,
  checkBrandPrimitives,
  checkPerformanceBudgets,
  checkTouchTargets,
  checkCoga,
  checkFluidTokens
} from "../../src/checks/phase1.js";
function makeConfig(overrides = {}) {
  return mergeWithDefaults({ brand: "#6366f1", ...overrides });
}
describe("Phase 1: Config Validation", () => {
  describe("checkBrandColor", () => {
    test("valid brand color produces info diagnostics", () => {
      const config = makeConfig({ brand: "#6366f1" });
      const diags = checkBrandColor(config);
      expect(diags.length).toBeGreaterThanOrEqual(2);
      expect(diags.every((d) => d.phase === "config")).toBe(true);
      const parseable = diags.find((d) => d.rule === "brand/parseable");
      expect(parseable?.severity).toBe("info");
      const contrast = diags.find((d) => d.rule === "contrast/brand-950-on-50");
      expect(contrast?.severity).toBe("info");
    });
    test("invalid brand color produces error", () => {
      const config = makeConfig();
      config.brand = "not-a-color";
      const diags = checkBrandColor(config);
      const errors = diags.filter((d) => d.severity === "error");
      expect(errors.length).toBeGreaterThan(0);
    });
    test("low-contrast brand color produces contrast error", () => {
      const config = makeConfig({ brand: "#e8e8e8" });
      const diags = checkBrandColor(config);
      const contrast = diags.find((d) => d.rule === "contrast/brand-950-on-50");
      expect(contrast).toBeDefined();
      expect(contrast.phase).toBe("config");
    });
  });
  describe("checkRoleColors", () => {
    test("valid role colors produce info diagnostics", () => {
      const config = makeConfig({
        roles: { danger: "#ef4444", success: "#22c55e" }
      });
      const diags = checkRoleColors(config);
      expect(diags.length).toBeGreaterThanOrEqual(2);
      expect(diags.every((d) => d.severity === "info")).toBe(true);
    });
    test("all role diagnostics have correct rule name", () => {
      const config = makeConfig();
      const diags = checkRoleColors(config);
      expect(diags.length).toBeGreaterThan(0);
      expect(diags.every((d) => d.rule === "roles/parseable")).toBe(true);
    });
    test("no roles returns empty", () => {
      const config = makeConfig();
      delete config.roles;
      const diags = checkRoleColors(config);
      expect(diags.length).toBe(0);
    });
  });
  describe("checkBrandChains", () => {
    test("valid chain produces info", () => {
      const config = makeConfig({
        brands: {
          base: { displayName: "Base", extends: null },
          child: { displayName: "Child", extends: "base" }
        }
      });
      const diags = checkBrandChains(config);
      expect(diags.length).toBe(2);
      expect(diags.every((d) => d.severity === "info")).toBe(true);
    });
    test("circular chain produces error", () => {
      const config = makeConfig({
        brands: {
          a: { displayName: "A", extends: "b" },
          b: { displayName: "B", extends: "a" }
        }
      });
      const diags = checkBrandChains(config);
      const err = diags.find((d) => d.severity === "error");
      expect(err).toBeDefined();
      expect(err.message).toContain("Circular");
    });
    test("no brands returns empty", () => {
      const config = makeConfig();
      const diags = checkBrandChains(config);
      expect(diags.length).toBe(0);
    });
  });
  describe("checkBrandPrimitives", () => {
    test("valid primitives produce info", () => {
      const config = makeConfig({
        brands: {
          acme: {
            displayName: "Acme",
            primitives: { color: { primary: "#ff6600" } }
          }
        }
      });
      const diags = checkBrandPrimitives(config);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe("info");
    });
    test("brand primitives produce diagnostics with correct rule", () => {
      const config = makeConfig({
        brands: {
          acme: {
            displayName: "Acme",
            primitives: { color: { primary: "#ff6600", accent: "#00ccff" } }
          }
        }
      });
      const diags = checkBrandPrimitives(config);
      expect(diags.length).toBe(2);
      expect(diags.every((d) => d.rule === "brands/primitives")).toBe(true);
    });
  });
  describe("checkPerformanceBudgets", () => {
    test("produces info diagnostics", () => {
      const config = makeConfig();
      const diags = checkPerformanceBudgets(config);
      expect(diags.length).toBe(2);
      expect(diags.every((d) => d.severity === "info")).toBe(true);
      expect(diags.every((d) => d.spec === "10")).toBe(true);
    });
  });
  describe("checkTouchTargets", () => {
    test("produces diagnostic for coarse pointer", () => {
      const diags = checkTouchTargets();
      expect(diags.length).toBe(1);
      expect(diags[0].rule).toBe("a11y/touch-target");
    });
  });
  describe("checkCoga", () => {
    test("no coga config returns empty", () => {
      const config = makeConfig();
      const diags = checkCoga(config);
      expect(diags.length).toBe(0);
    });
    test("coga config produces info diagnostics", () => {
      const config = makeConfig({
        cognitiveAccessibility: {
          cognitiveLoad: {
            maxInteractivePerSection: 7,
            maxNavItems: 8
          },
          content: {
            maxReadingLevel: 8,
            maxUIStringWords: 5
          },
          errorPrevention: {
            undoWindowSeconds: 8,
            autoSaveIntervalSeconds: 30
          }
        }
      });
      const diags = checkCoga(config);
      expect(diags.length).toBe(3);
      expect(diags.every((d) => d.severity === "info")).toBe(true);
    });
  });
  describe("checkFluidTokens", () => {
    test("fluid tokens are enabled by default", () => {
      const config = makeConfig();
      const diags = checkFluidTokens(config);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe("info");
    });
    test("explicitly disabled fluid tokens returns empty", () => {
      const config = makeConfig({
        fluidTokens: { enabled: false }
      });
      const diags = checkFluidTokens(config);
      expect(diags.length).toBe(0);
    });
    test("valid viewport range produces info", () => {
      const config = makeConfig({
        fluidTokens: { enabled: true, minViewport: 320, maxViewport: 1440 }
      });
      const diags = checkFluidTokens(config);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe("info");
    });
    test("inverted viewport range produces error", () => {
      const config = makeConfig({
        fluidTokens: { enabled: true, minViewport: 1440, maxViewport: 320 }
      });
      const diags = checkFluidTokens(config);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe("error");
      expect(diags[0].rule).toBe("fluid/viewport-range");
    });
  });
});
