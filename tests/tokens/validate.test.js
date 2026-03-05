// @ts-check

/**
 * Repository module for validate.test.
 * @module
 */
import { describe, test, expect } from "bun:test";
import { validateDTCG } from "../../src/tokens/validate.js";
const validTree = {
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
    "4": { $value: "1rem" },
    "8": { $value: "2rem" }
  },
  duration: {
    $type: "duration",
    fast: { $value: "100ms" }
  },
  easing: {
    $type: "cubicBezier",
    default: { $value: [0.2, 0, 0, 1] }
  }
};
describe("validateDTCG - valid tree", () => {
  test("returns valid: true for a correct tree", () => {
    const result = validateDTCG(validTree);
    expect(result.valid).toBe(true);
  });
  test("returns no errors for a correct tree", () => {
    const result = validateDTCG(validTree);
    expect(result.errors.length).toBe(0);
  });
  test("returns valid: true for a tree with all 13 DTCG types", () => {
    const allTypesTree = {
      color: { tok: { $value: "#fff", $type: "color" } },
      dimension: { tok: { $value: "4px", $type: "dimension" } },
      fontFamily: { tok: { $value: "Inter", $type: "fontFamily" } },
      fontWeight: { tok: { $value: 400, $type: "fontWeight" } },
      duration: { tok: { $value: "100ms", $type: "duration" } },
      cubicBezier: { tok: { $value: [0.2, 0, 0, 1], $type: "cubicBezier" } },
      number: { tok: { $value: 1.5, $type: "number" } },
      strokeStyle: { tok: { $value: "solid", $type: "strokeStyle" } },
      border: {
        tok: {
          $value: { width: "1px", color: "#000", style: "solid" },
          $type: "border"
        }
      },
      transition: {
        tok: {
          $value: { duration: "200ms", delay: "0ms", timingFunction: [0.2, 0, 0, 1] },
          $type: "transition"
        }
      },
      shadow: {
        tok: {
          $value: { offsetX: "0", offsetY: "2px", blur: "4px", spread: "0", color: "#000" },
          $type: "shadow"
        }
      },
      gradient: {
        tok: {
          $value: [{ color: "#fff", position: 0 }, { color: "#000", position: 1 }],
          $type: "gradient"
        }
      },
      typography: {
        tok: {
          $value: {
            fontFamily: "Inter",
            fontSize: "16px",
            fontWeight: 400,
            lineHeight: 1.5,
            letterSpacing: "0em"
          },
          $type: "typography"
        }
      }
    };
    const result = validateDTCG(allTypesTree);
    expect(result.valid).toBe(true);
  });
  test("alias to existing token is valid", () => {
    const result = validateDTCG(validTree);
    expect(result.valid).toBe(true);
  });
  test("group-level $type inheritance is accepted", () => {
    const tree = {
      space: {
        $type: "dimension",
        sm: { $value: "4px" },
        md: { $value: "8px" }
      }
    };
    const result = validateDTCG(tree);
    expect(result.valid).toBe(true);
  });
});
describe("validateDTCG - MISSING_VALUE", () => {
  test("fails when $value is missing", () => {
    const tree = {
      color: {
        bad: { $type: "color" }
      }
    };
    const treeWithUndef = {
      color: {
        bad: { $value: undefined, $type: "color" }
      }
    };
    const result = validateDTCG(treeWithUndef);
    const missingErrors = result.errors.filter((e) => e.code === "MISSING_VALUE");
    expect(missingErrors.length).toBeGreaterThan(0);
  });
});
describe("validateDTCG - INVALID_TYPE", () => {
  test("fails when $type is not a valid DTCG type", () => {
    const tree = {
      color: {
        brand: {
          "500": {
            $value: "oklch(0.55 0.15 250)",
            $type: "notAValidType"
          }
        }
      }
    };
    const result = validateDTCG(tree);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_TYPE")).toBe(true);
  });
  test("INVALID_TYPE error includes the bad type in the message", () => {
    const tree = {
      color: {
        tok: {
          $value: "#fff",
          $type: "badType"
        }
      }
    };
    const result = validateDTCG(tree);
    const typeError = result.errors.find((e) => e.code === "INVALID_TYPE");
    expect(typeError).toBeDefined();
    expect(typeError.message).toContain("badType");
  });
  test("fails when group-level $type is invalid", () => {
    const tree = {
      myGroup: {
        $type: "invalidGroupType",
        tok: { $value: "4px" }
      }
    };
    const result = validateDTCG(tree);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_TYPE")).toBe(true);
  });
});
describe("validateDTCG - DANGLING_ALIAS", () => {
  test("fails when an alias references a non-existent token", () => {
    const tree = {
      color: {
        action: {
          primary: { $value: "{color.brand.999}", $type: "color" }
        }
      }
    };
    const result = validateDTCG(tree);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DANGLING_ALIAS")).toBe(true);
  });
  test("DANGLING_ALIAS error includes the token path", () => {
    const tree = {
      color: {
        action: {
          primary: { $value: "{does.not.exist}", $type: "color" }
        }
      }
    };
    const result = validateDTCG(tree);
    const danglingError = result.errors.find((e) => e.code === "DANGLING_ALIAS");
    expect(danglingError).toBeDefined();
    expect(danglingError.path).toBe("color.action.primary");
    expect(danglingError.message).toContain("does.not.exist");
  });
});
describe("validateDTCG - CIRCULAR_REFERENCE", () => {
  test("fails when a two-token circular alias exists", () => {
    const tree = {
      color: {
        a: { $value: "{color.b}", $type: "color" },
        b: { $value: "{color.a}", $type: "color" }
      }
    };
    const result = validateDTCG(tree);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "CIRCULAR_REFERENCE")).toBe(true);
  });
  test("CIRCULAR_REFERENCE error includes the token path", () => {
    const tree = {
      token: {
        x: { $value: "{token.y}", $type: "color" },
        y: { $value: "{token.x}", $type: "color" }
      }
    };
    const result = validateDTCG(tree);
    const circError = result.errors.find((e) => e.code === "CIRCULAR_REFERENCE");
    expect(circError).toBeDefined();
    expect(circError.message).toContain("circular");
  });
  test("self-referencing token is flagged as circular", () => {
    const tree = {
      color: {
        self: { $value: "{color.self}", $type: "color" }
      }
    };
    const result = validateDTCG(tree);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "CIRCULAR_REFERENCE")).toBe(true);
  });
});
describe("validateDTCG - ValidationError structure", () => {
  test("every error has path, code, and message fields", () => {
    const tree = {
      color: {
        bad: { $value: "{does.not.exist}", $type: "color" }
      }
    };
    const result = validateDTCG(tree);
    for (const err of result.errors) {
      expect(typeof err.path).toBe("string");
      expect(typeof err.code).toBe("string");
      expect(typeof err.message).toBe("string");
      expect(err.path.length).toBeGreaterThan(0);
      expect(err.code.length).toBeGreaterThan(0);
      expect(err.message.length).toBeGreaterThan(0);
    }
  });
  test("multiple errors are all returned (not early-exit)", () => {
    const tree = {
      color: {
        a: { $value: "{does.not.exist.a}", $type: "color" },
        b: { $value: "{does.not.exist.b}", $type: "color" },
        c: { $value: "#fff", $type: "badType" }
      }
    };
    const result = validateDTCG(tree);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
