// @ts-check

/**
 * Repository module for resolve.test.
 * @module
 */
import { describe, test, expect } from "bun:test";
import {
  resolveToken,
  resolveAllTokens,
  CircularReferenceError,
  MissingTokenError
} from "../../src/tokens/resolve.js";
const primitiveTree = {
  color: {
    $type: "color",
    brand: {
      "500": { $value: "oklch(0.55 0.15 250)", $type: "color" },
      "600": { $value: "oklch(0.46 0.14 250)", $type: "color" }
    },
    slate: {
      "800": { $value: "oklch(0.28 0.015 248)", $type: "color" }
    }
  },
  space: {
    $type: "dimension",
    "4": { $value: "1rem" },
    "6": { $value: "1.5rem" }
  }
};
const aliasTree = {
  color: {
    $type: "color",
    brand: {
      "500": { $value: "oklch(0.55 0.15 250)", $type: "color" }
    },
    action: {
      primary: { $value: "{color.brand.500}", $type: "color" }
    }
  },
  button: {
    background: {
      primary: { $value: "{color.action.primary}" }
    }
  }
};
const circularTree = {
  color: {
    a: { $value: "{color.b}", $type: "color" },
    b: { $value: "{color.a}", $type: "color" }
  }
};
const deepAliasTree = {
  color: {
    $type: "color",
    base: { "500": { $value: "oklch(0.55 0.15 250)", $type: "color" } },
    tier1: { val: { $value: "{color.base.500}", $type: "color" } },
    tier2: { val: { $value: "{color.tier1.val}", $type: "color" } },
    tier3: { val: { $value: "{color.tier2.val}", $type: "color" } }
  }
};
describe("resolveToken", () => {
  test("resolves a simple literal token", () => {
    const result = resolveToken("color.brand.500", primitiveTree);
    expect(result).toBe("oklch(0.55 0.15 250)");
  });
  test("resolves a one-level alias", () => {
    const result = resolveToken("color.action.primary", aliasTree);
    expect(result).toBe("oklch(0.55 0.15 250)");
  });
  test("resolves a two-level alias chain", () => {
    const result = resolveToken("button.background.primary", aliasTree);
    expect(result).toBe("oklch(0.55 0.15 250)");
  });
  test("resolves a three-level alias chain", () => {
    const result = resolveToken("color.tier3.val", deepAliasTree);
    expect(result).toBe("oklch(0.55 0.15 250)");
  });
  test("returns numeric values as-is", () => {
    const tree = {
      opacity: {
        hover: { $value: 0.08, $type: "number" }
      }
    };
    expect(resolveToken("opacity.hover", tree)).toBe(0.08);
  });
  test("throws CircularReferenceError on a two-node cycle", () => {
    expect(() => resolveToken("color.a", circularTree)).toThrow(CircularReferenceError);
  });
  test("CircularReferenceError includes the cycle in its message", () => {
    let err = null;
    try {
      resolveToken("color.a", circularTree);
    } catch (e) {
      err = e;
    }
    expect(err).not.toBeNull();
    expect(err.message).toContain("Circular reference");
    expect(err.cycle.length).toBeGreaterThan(0);
  });
  test("throws MissingTokenError for a dangling alias", () => {
    const tree = {
      color: {
        action: {
          primary: { $value: "{color.brand.500}", $type: "color" }
        }
      }
    };
    expect(() => resolveToken("color.action.primary", tree)).toThrow(MissingTokenError);
  });
  test("throws MissingTokenError for a completely missing path", () => {
    expect(() => resolveToken("does.not.exist", primitiveTree)).toThrow(MissingTokenError);
  });
  test("caches results - second call returns same value", () => {
    const r1 = resolveToken("color.brand.500", primitiveTree);
    const r2 = resolveToken("color.brand.500", primitiveTree);
    expect(r1).toBe(r2);
  });
});
describe("resolveAllTokens", () => {
  test("returns a flat map of paths to values", () => {
    const flat = resolveAllTokens(primitiveTree);
    expect(typeof flat).toBe("object");
    expect(flat["color.brand.500"]).toBe("oklch(0.55 0.15 250)");
    expect(flat["space.4"]).toBe("1rem");
  });
  test("resolves aliases in the flat map", () => {
    const flat = resolveAllTokens(aliasTree);
    expect(flat["color.action.primary"]).toBe("oklch(0.55 0.15 250)");
    expect(flat["button.background.primary"]).toBe("oklch(0.55 0.15 250)");
    expect(flat["color.brand.500"]).toBe("oklch(0.55 0.15 250)");
  });
  test("includes all primitive tokens in the flat map", () => {
    const flat = resolveAllTokens(primitiveTree);
    const paths = Object.keys(flat);
    expect(paths).toContain("color.brand.500");
    expect(paths).toContain("color.brand.600");
    expect(paths).toContain("color.slate.800");
    expect(paths).toContain("space.4");
    expect(paths).toContain("space.6");
  });
  test("flat map does not include group metadata keys", () => {
    const flat = resolveAllTokens(primitiveTree);
    const paths = Object.keys(flat);
    expect(paths.some((p) => p.includes("$"))).toBe(false);
  });
  test("handles a tree with only literal tokens", () => {
    const tree = {
      spacing: {
        sm: { $value: "4px", $type: "dimension" },
        md: { $value: "8px", $type: "dimension" }
      }
    };
    const flat = resolveAllTokens(tree);
    expect(flat["spacing.sm"]).toBe("4px");
    expect(flat["spacing.md"]).toBe("8px");
  });
});
