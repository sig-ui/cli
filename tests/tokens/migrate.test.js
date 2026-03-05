// @ts-check

/**
 * Repository module for migrate.test.
 * @module
 */
import { describe, test, expect } from "bun:test";
import {
  diffTokenSets,
  detectBreakingChanges,
  generateDeprecationNotice
} from "../../src/tokens/migrate.js";
const v1Tree = {
  color: {
    $type: "color",
    brand: {
      "500": { $value: "oklch(0.55 0.15 250)", $type: "color" },
      "600": { $value: "oklch(0.46 0.14 250)", $type: "color" }
    },
    action: {
      primary: { $value: "{color.brand.500}", $type: "color" }
    }
  },
  space: {
    $type: "dimension",
    "4": { $value: "1rem" }
  }
};
const v2Tree = {
  color: {
    $type: "color",
    brand: {
      "500": { $value: "oklch(0.56 0.15 250)", $type: "color" }
    },
    action: {
      primary: { $value: "{color.brand.500}", $type: "color" }
    },
    surface: {
      default: { $value: "{color.brand.500}", $type: "color" }
    }
  },
  space: {
    $type: "dimension",
    "4": { $value: "1rem" },
    "8": { $value: "2rem" }
  }
};
describe("diffTokenSets", () => {
  test("returns a diff object with added/removed/changed arrays", () => {
    const diff = diffTokenSets(v1Tree, v2Tree);
    expect(Array.isArray(diff.added)).toBe(true);
    expect(Array.isArray(diff.removed)).toBe(true);
    expect(Array.isArray(diff.changed)).toBe(true);
  });
  test("detects added tokens", () => {
    const diff = diffTokenSets(v1Tree, v2Tree);
    const addedPaths = diff.added.map((t) => t.path);
    expect(addedPaths).toContain("color.surface.default");
    expect(addedPaths).toContain("space.8");
  });
  test("detects removed tokens", () => {
    const diff = diffTokenSets(v1Tree, v2Tree);
    const removedPaths = diff.removed.map((t) => t.path);
    expect(removedPaths).toContain("color.brand.600");
  });
  test("detects value changes", () => {
    const diff = diffTokenSets(v1Tree, v2Tree);
    const changedPaths = diff.changed.map((t) => t.path);
    expect(changedPaths).toContain("color.brand.500");
  });
  test("changed entry includes previous and current values", () => {
    const diff = diffTokenSets(v1Tree, v2Tree);
    const brandChange = diff.changed.find((t) => t.path === "color.brand.500");
    expect(brandChange).toBeDefined();
    expect(brandChange.previousValue).toBe("oklch(0.55 0.15 250)");
    expect(brandChange.currentValue).toBe("oklch(0.56 0.15 250)");
  });
  test("added entry includes the token value", () => {
    const diff = diffTokenSets(v1Tree, v2Tree);
    const surfaceAdded = diff.added.find((t) => t.path === "color.surface.default");
    expect(surfaceAdded).toBeDefined();
    expect(surfaceAdded.value).toBe("{color.brand.500}");
  });
  test("removed entry includes the token value", () => {
    const diff = diffTokenSets(v1Tree, v2Tree);
    const brandRemoved = diff.removed.find((t) => t.path === "color.brand.600");
    expect(brandRemoved).toBeDefined();
    expect(brandRemoved.value).toBe("oklch(0.46 0.14 250)");
  });
  test("returns empty arrays when trees are identical", () => {
    const diff = diffTokenSets(v1Tree, v1Tree);
    expect(diff.added.length).toBe(0);
    expect(diff.removed.length).toBe(0);
    expect(diff.changed.length).toBe(0);
  });
  test("detects type changes in changed tokens", () => {
    const oldTree = {
      token: {
        size: { $value: "16px", $type: "dimension" }
      }
    };
    const newTree = {
      token: {
        size: { $value: 16, $type: "number" }
      }
    };
    const diff = diffTokenSets(oldTree, newTree);
    expect(diff.changed.length).toBe(1);
    expect(diff.changed[0].previousType).toBe("dimension");
    expect(diff.changed[0].currentType).toBe("number");
  });
});
describe("detectBreakingChanges", () => {
  test("flags removed tokens as breaking", () => {
    const diff = diffTokenSets(v1Tree, v2Tree);
    const breaking = detectBreakingChanges(diff);
    const removalBreaks = breaking.filter((b) => b.kind === "removal");
    expect(removalBreaks.length).toBeGreaterThan(0);
    const removedPath = removalBreaks.find((b) => b.kind === "removal" && b.path === "color.brand.600");
    expect(removedPath).toBeDefined();
  });
  test("does not flag added tokens as breaking", () => {
    const diff = diffTokenSets(v1Tree, v2Tree);
    const breaking = detectBreakingChanges(diff);
    const addedPaths = diff.added.map((t) => t.path);
    for (const bc of breaking) {
      if ("path" in bc) {
        expect(addedPaths).not.toContain(bc.path);
      }
    }
  });
  test("flags type changes as breaking", () => {
    const oldTree = {
      token: {
        size: { $value: "16px", $type: "dimension" }
      }
    };
    const newTree = {
      token: {
        size: { $value: 16, $type: "number" }
      }
    };
    const diff = diffTokenSets(oldTree, newTree);
    const breaking = detectBreakingChanges(diff);
    const typeChanges = breaking.filter((b) => b.kind === "typeChange");
    expect(typeChanges.length).toBe(1);
  });
  test("flags alias-to-literal changes as breaking", () => {
    const oldTree = {
      color: {
        primary: { $value: "{color.brand.500}", $type: "color" }
      }
    };
    const newTree = {
      color: {
        primary: { $value: "oklch(0.55 0.15 250)", $type: "color" }
      }
    };
    const diff = diffTokenSets(oldTree, newTree);
    const breaking = detectBreakingChanges(diff);
    const aliasChanges = breaking.filter((b) => b.kind === "aliasStructureChange");
    expect(aliasChanges.length).toBe(1);
  });
  test("returns empty array when no breaking changes", () => {
    const diffWithAdditionsOnly = diffTokenSets(v1Tree, v2Tree);
    const noBreakDiff = {
      added: diffWithAdditionsOnly.added,
      removed: [],
      changed: []
    };
    const breaking = detectBreakingChanges(noBreakDiff);
    expect(breaking.length).toBe(0);
  });
  test("pure value changes are not flagged as breaking", () => {
    const oldTree = {
      color: {
        brand: {
          "500": { $value: "oklch(0.55 0.15 250)", $type: "color" }
        }
      }
    };
    const newTree = {
      color: {
        brand: {
          "500": { $value: "oklch(0.56 0.15 250)", $type: "color" }
        }
      }
    };
    const diff = diffTokenSets(oldTree, newTree);
    const breaking = detectBreakingChanges(diff);
    expect(breaking.length).toBe(0);
  });
});
describe("generateDeprecationNotice", () => {
  test("adds deprecatedSince to token extensions", () => {
    const tree = {
      color: {
        bg: { $value: "{color.surface.default}", $type: "color" }
      }
    };
    generateDeprecationNotice(tree, "color.bg");
    const token = tree["color"]["bg"];
    const extensions = token.$extensions?.["com.sigui"];
    expect(extensions).toBeDefined();
    expect(extensions["deprecatedSince"]).toBeDefined();
  });
  test("adds replacedBy when replacement is provided", () => {
    const tree = {
      color: {
        bg: { $value: "{color.surface.default}", $type: "color" }
      }
    };
    generateDeprecationNotice(tree, "color.bg", "{color.surface.default}");
    const token = tree["color"]["bg"];
    const extensions = token.$extensions?.["com.sigui"];
    expect(extensions["replacedBy"]).toBe("{color.surface.default}");
  });
  test("adds removalTarget when removeInVersion is provided", () => {
    const tree = {
      color: {
        bg: { $value: "{color.surface.default}", $type: "color" }
      }
    };
    generateDeprecationNotice(tree, "color.bg", undefined, "2.0.0");
    const token = tree["color"]["bg"];
    const extensions = token.$extensions?.["com.sigui"];
    expect(extensions["removalTarget"]).toBe("2.0.0");
  });
  test("returns the same tree (for chaining)", () => {
    const tree = {
      color: {
        bg: { $value: "#fff", $type: "color" }
      }
    };
    const result = generateDeprecationNotice(tree, "color.bg");
    expect(result).toBe(tree);
  });
  test("throws when token path does not exist", () => {
    const tree = {
      color: {
        brand: { "500": { $value: "#fff", $type: "color" } }
      }
    };
    expect(() => generateDeprecationNotice(tree, "color.nonexistent")).toThrow();
  });
  test("preserves existing extensions when adding deprecation", () => {
    const tree = {
      color: {
        brand: {
          "500": {
            $value: "oklch(0.55 0.15 250)",
            $type: "color",
            $extensions: {
              "com.sigui": {
                gamut: "p3",
                srgbFallback: "#6366f1"
              }
            }
          }
        }
      }
    };
    generateDeprecationNotice(tree, "color.brand.500", "{color.brand.600}");
    const token = tree["color"]["brand"]["500"];
    const sigui = token.$extensions?.["com.sigui"];
    expect(sigui["gamut"]).toBe("p3");
    expect(sigui["srgbFallback"]).toBe("#6366f1");
    expect(sigui["replacedBy"]).toBe("{color.brand.600}");
  });
});
