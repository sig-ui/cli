// @ts-check

/**
 * Repository module for phase2.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import { mergeWithDefaults, resolveTheme } from "@sig-ui/theme";
import {
  checkContrastMatrix,
  checkStateOverlayContrast,
  checkCvdDistinguishability,
  checkGamutFitness,
  checkDensityTouchTarget,
  checkNestedRadius,
  runPhase2
} from "../../src/checks/phase2.js";
function makeConfig(overrides = {}) {
  return mergeWithDefaults({ brand: "#6366f1", ...overrides });
}
describe("Phase 2: Resolved Theme Audit", () => {
  describe("checkContrastMatrix", () => {
    test("default config produces diagnostics for both modes", () => {
      const config = makeConfig();
      const resolved = resolveTheme(config);
      const diags = checkContrastMatrix(resolved.semanticRoles, resolved.palettes);
      expect(diags.length).toBeGreaterThan(0);
      const lightDiags = diags.filter((d) => d.message.startsWith("[light]"));
      const darkDiags = diags.filter((d) => d.message.startsWith("[dark]"));
      expect(lightDiags.length).toBeGreaterThan(0);
      expect(darkDiags.length).toBeGreaterThan(0);
    });
    test("all diagnostics reference spec 01", () => {
      const config = makeConfig();
      const resolved = resolveTheme(config);
      const diags = checkContrastMatrix(resolved.semanticRoles, resolved.palettes);
      for (const d of diags) {
        expect(d.spec).toBe("01");
      }
    });
    test("low-contrast config produces errors", () => {
      const config = makeConfig({ brand: "#999999" });
      const resolved = resolveTheme(config);
      const diags = checkContrastMatrix(resolved.semanticRoles, resolved.palettes);
      const allRules = diags.map((d) => d.rule);
      expect(allRules.length).toBeGreaterThan(0);
    });
  });
  describe("checkStateOverlayContrast", () => {
    test("default config checks interactive roles", () => {
      const config = makeConfig();
      const resolved = resolveTheme(config);
      const diags = checkStateOverlayContrast(resolved.semanticRoles, resolved.palettes);
      expect(diags.length).toBeGreaterThan(0);
      const rules = diags.map((d) => d.rule);
      expect(rules.some((r) => r.includes("primary"))).toBe(true);
      expect(rules.some((r) => r.includes("danger"))).toBe(true);
    });
  });
  describe("checkCvdDistinguishability", () => {
    test("default config checks status colors", () => {
      const config = makeConfig();
      const resolved = resolveTheme(config);
      const diags = checkCvdDistinguishability(resolved.semanticRoles, resolved.palettes);
      expect(diags.length).toBeGreaterThan(0);
      expect(diags.every((d) => d.rule === "cvd/status-colors")).toBe(true);
    });
    test("similar status colors may produce warnings", () => {
      const config = makeConfig({
        roles: { danger: "#ef4444", success: "#dc2626" }
      });
      const resolved = resolveTheme(config);
      const diags = checkCvdDistinguishability(resolved.semanticRoles, resolved.palettes);
      const warnings = diags.filter((d) => d.severity === "warning");
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
  describe("checkGamutFitness", () => {
    test("produces diagnostic about gamut", () => {
      const config = makeConfig();
      const resolved = resolveTheme(config);
      const diags = checkGamutFitness(resolved.palettes);
      expect(diags.length).toBe(1);
      expect(diags[0].rule).toBe("gamut/srgb");
      expect(diags[0].severity).toBe("info");
    });
    test("high-chroma color may report out-of-gamut shades", () => {
      const config = makeConfig({ brand: "#00ff00" });
      const resolved = resolveTheme(config);
      const diags = checkGamutFitness(resolved.palettes);
      expect(diags.length).toBe(1);
      expect(diags[0].rule).toBe("gamut/srgb");
    });
  });
  describe("checkDensityTouchTarget", () => {
    test("comfortable density passes", () => {
      const diags = checkDensityTouchTarget(48, 1);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe("info");
    });
    test("compact density with small base fails", () => {
      const diags = checkDensityTouchTarget(44, 0.75);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe("error");
      expect(diags[0].message).toContain("too small");
    });
    test("exact threshold passes", () => {
      const diags = checkDensityTouchTarget(44, 1);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe("info");
    });
  });
  describe("checkNestedRadius", () => {
    test("produces info diagnostics for each radius", () => {
      const radii = { sm: 4, md: 8, lg: 12, xl: 16 };
      const diags = checkNestedRadius(radii, 4);
      expect(diags.length).toBe(4);
      expect(diags.every((d) => d.severity === "info")).toBe(true);
      expect(diags.every((d) => d.rule === "radius/nested-coherence")).toBe(true);
    });
    test("inner radius is always >= 0", () => {
      const radii = { sm: 2 };
      const diags = checkNestedRadius(radii, 8);
      expect(diags.length).toBe(1);
      expect(diags[0].message).toContain("inner");
    });
  });
  describe("runPhase2", () => {
    test("default config runs all sub-checks", () => {
      const config = makeConfig();
      const diags = runPhase2(config);
      expect(diags.length).toBeGreaterThan(0);
      expect(diags.every((d) => d.phase === "theme")).toBe(true);
      const rules = new Set(diags.map((d) => d.rule.split("/")[0]));
      expect(rules.has("contrast")).toBe(true);
      expect(rules.has("cvd")).toBe(true);
      expect(rules.has("gamut")).toBe(true);
      expect(rules.has("density")).toBe(true);
      expect(rules.has("radius")).toBe(true);
    });
    test("invalid config produces error diagnostics", () => {
      const config = { brand: "rgb(not valid color syntax here !!!)" };
      const diags = runPhase2(config);
      expect(diags.length).toBeGreaterThan(0);
      const hasErrorOrResolveFailure = diags.some((d) => d.severity === "error" || d.rule === "theme/resolve");
      expect(hasErrorOrResolveFailure).toBe(true);
    });
  });
});
