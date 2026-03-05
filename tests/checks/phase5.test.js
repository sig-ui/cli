// @ts-check

/**
 * Repository module for phase5.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import {
  checkProximityHierarchy,
  checkRhythmRegularity,
  checkLineMeasure,
  checkTouchTargets,
  checkAlignmentConsistency
} from "../../src/checks/phase5.js";
describe("Phase 5: Layout Quality Audit", () => {
  describe("checkProximityHierarchy", () => {
    test("clean CSS produces no diagnostics", () => {
      const css = `:root {
  --sg-space-2: 8px;
  --sg-space-4: 16px;
}
.card {
  padding: var(--sg-space-2);
  margin: var(--sg-space-4);
}`;
      const diags = checkProximityHierarchy(css);
      expect(diags.length).toBe(0);
    });
    test("detects inner >= outer violation", () => {
      const css = `:root {
  --sg-space-6: 24px;
  --sg-space-2: 8px;
}
.card {
  padding: var(--sg-space-6);
  margin: var(--sg-space-2);
}`;
      const diags = checkProximityHierarchy(css);
      expect(diags.length).toBe(1);
      expect(diags[0].phase).toBe("layout");
      expect(diags[0].rule).toBe("layout/proximity-hierarchy");
      expect(diags[0].severity).toBe("warning");
      expect(diags[0].spec).toBe("03");
    });
  });
  describe("checkRhythmRegularity", () => {
    test("consistent gaps produce no diagnostics", () => {
      const css = `.a {
  gap: 16px;
}
.b {
  gap: 16px;
}`;
      const diags = checkRhythmRegularity(css);
      expect(diags.filter((d) => d.rule === "layout/rhythm-regularity")).toHaveLength(0);
    });
    test("high variability produces warning", () => {
      const css = `.a {
  gap: 4px;
}
.b {
  gap: 64px;
}`;
      const diags = checkRhythmRegularity(css);
      expect(diags.some((d) => d.rule === "layout/rhythm-regularity")).toBe(true);
      expect(diags.every((d) => d.phase === "layout")).toBe(true);
    });
  });
  describe("checkLineMeasure", () => {
    test("prose with max-width in range passes", () => {
      const css = `.article {
  font-size: 1rem;
  max-width: 65ch;
}`;
      const diags = checkLineMeasure(css);
      expect(diags.length).toBe(0);
    });
    test("prose without max-width produces warning", () => {
      const css = `.article {
  font-size: 1rem;
}`;
      const diags = checkLineMeasure(css);
      expect(diags.length).toBe(1);
      expect(diags[0].rule).toBe("layout/line-measure");
      expect(diags[0].phase).toBe("layout");
    });
  });
  describe("checkTouchTargets", () => {
    test("button with sufficient min-height passes", () => {
      const css = `.sg-button {
  min-height: 44px;
}`;
      const diags = checkTouchTargets(css);
      expect(diags.length).toBe(0);
    });
    test("button with insufficient height produces warning", () => {
      const css = `button {
  min-height: 32px;
}`;
      const diags = checkTouchTargets(css);
      expect(diags.length).toBe(1);
      expect(diags[0].rule).toBe("layout/touch-target");
      expect(diags[0].severity).toBe("warning");
      expect(diags[0].spec).toBe("03");
    });
  });
  describe("checkAlignmentConsistency", () => {
    test("few distinct left-edge values pass", () => {
      const css = `.sg-card {
  padding-left: 16px;
}
.sg-card-header {
  padding-left: 16px;
}`;
      const diags = checkAlignmentConsistency(css);
      expect(diags.length).toBe(0);
    });
    test("many distinct left-edge values produce warning", () => {
      const css = `.sg-card {
  padding-left: 4px;
}
.sg-card-header {
  padding-left: 8px;
}
.sg-card-body {
  padding-left: 16px;
}
.sg-card-footer {
  padding-left: 24px;
}`;
      const diags = checkAlignmentConsistency(css);
      expect(diags.length).toBe(1);
      expect(diags[0].rule).toBe("layout/alignment-consistency");
      expect(diags[0].phase).toBe("layout");
    });
  });
  describe("diagnostic format", () => {
    test("all diagnostics have phase=layout and spec=03", () => {
      const css = `button {
  padding: 8px;
}
.prose {
  font-size: 1rem;
}
.a {
  gap: 4px;
}
.b {
  gap: 64px;
}`;
      const allDiags = [
        ...checkTouchTargets(css),
        ...checkLineMeasure(css),
        ...checkRhythmRegularity(css)
      ];
      for (const d of allDiags) {
        expect(d.phase).toBe("layout");
        expect(d.spec).toBe("03");
      }
    });
    test("rule names are prefixed with layout/", () => {
      const css = `button {
  padding: 8px;
}`;
      const diags = checkTouchTargets(css);
      for (const d of diags) {
        expect(d.rule.startsWith("layout/")).toBe(true);
      }
    });
  });
});
