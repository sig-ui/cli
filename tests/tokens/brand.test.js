// @ts-check

/**
 * Repository module for brand.test.
 * @module
 */
import { describe, test, expect } from "bun:test";
import {
  mergeBrandOverrides,
  createBrandTheme,
  resolveBrandChain,
  createAllBrandThemes
} from "../../src/tokens/brand.js";
import { resolveToken } from "../../src/tokens/resolve.js";
const baseTree = {
  color: {
    $type: "color",
    brand: {
      "500": { $value: "oklch(0.55 0.15 250)", $type: "color" },
      "600": { $value: "oklch(0.46 0.14 250)", $type: "color" }
    },
    blue: {
      "500": { $value: "oklch(0.55 0.20 250)", $type: "color" }
    },
    action: {
      primary: { $value: "{color.brand.500}", $type: "color" },
      secondary: { $value: "{color.brand.600}", $type: "color" }
    }
  },
  radius: {
    $type: "dimension",
    sm: { $value: "4px" },
    md: { $value: "8px" },
    full: { $value: "9999px" }
  },
  button: {
    radius: { $value: "{radius.md}" },
    background: {
      primary: { $value: "{color.action.primary}" }
    }
  }
};
describe("mergeBrandOverrides", () => {
  test("base tokens are preserved when not overridden", () => {
    const merged = mergeBrandOverrides(baseTree, {});
    const brandToken = merged["color"]["brand"];
    expect(brandToken["500"].$value).toBe("oklch(0.55 0.15 250)");
  });
  test("brand overrides replace target tokens", () => {
    const override = {
      color: {
        action: {
          primary: { $value: "{color.blue.500}", $type: "color" }
        }
      }
    };
    const merged = mergeBrandOverrides(baseTree, override);
    const actionPrimary = merged["color"]["action"]["primary"];
    expect(actionPrimary.$value).toBe("{color.blue.500}");
  });
  test("base tree is not mutated", () => {
    const overridePrimary = {
      radius: {
        md: { $value: "2px" }
      }
    };
    mergeBrandOverrides(baseTree, overridePrimary);
    const radiusGroup = baseTree["radius"];
    expect(radiusGroup["md"].$value).toBe("8px");
  });
  test("nested overrides work correctly", () => {
    const override = {
      button: {
        radius: { $value: "{radius.full}" }
      }
    };
    const merged = mergeBrandOverrides(baseTree, override);
    const buttonRadius = merged["button"]["radius"];
    expect(buttonRadius.$value).toBe("{radius.full}");
  });
  test("non-overridden sibling tokens are preserved", () => {
    const override = {
      color: {
        action: {
          primary: { $value: "{color.blue.500}", $type: "color" }
        }
      }
    };
    const merged = mergeBrandOverrides(baseTree, override);
    const actionSecondary = merged["color"]["action"]["secondary"];
    expect(actionSecondary.$value).toBe("{color.brand.600}");
  });
  test("merging empty override returns equivalent of base tree", () => {
    const merged = mergeBrandOverrides(baseTree, {});
    const val = resolveToken("color.brand.500", merged);
    expect(val).toBe("oklch(0.55 0.15 250)");
  });
});
describe("createBrandTheme", () => {
  test("returns a new token tree", () => {
    const result = createBrandTheme(baseTree, { name: "test-brand" });
    expect(typeof result).toBe("object");
    expect(result).not.toBe(baseTree);
  });
  test("semantic overrides are applied", () => {
    const result = createBrandTheme(baseTree, {
      name: "acme-pro",
      semanticOverrides: {
        "color.action.primary": "{color.blue.500}"
      }
    });
    const primaryToken = result["color"]["action"]["primary"];
    expect(primaryToken.$value).toBe("{color.blue.500}");
  });
  test("component overrides are applied on top of semantic overrides", () => {
    const result = createBrandTheme(baseTree, {
      name: "acme-pro",
      semanticOverrides: {
        "color.action.primary": "{color.blue.500}"
      },
      componentOverrides: {
        "button.radius": "{radius.full}"
      }
    });
    const buttonRadius = result["button"]["radius"];
    expect(buttonRadius.$value).toBe("{radius.full}");
  });
  test("base tokens are preserved when not overridden", () => {
    const result = createBrandTheme(baseTree, {
      name: "minimal-brand",
      semanticOverrides: {
        "color.action.primary": "{color.blue.500}"
      }
    });
    const brandColor = resolveToken("color.brand.500", result);
    expect(brandColor).toBe("oklch(0.55 0.15 250)");
  });
  test("base tree is not mutated", () => {
    createBrandTheme(baseTree, {
      name: "mutation-test",
      semanticOverrides: {
        "radius.md": "2px"
      }
    });
    const md = baseTree["radius"]["md"];
    expect(md.$value).toBe("8px");
  });
  test("mode overrides are stored in _brandModes key", () => {
    const result = createBrandTheme(baseTree, {
      name: "dark-brand",
      modes: {
        dark: {
          "color.action.primary": "{color.brand.600}"
        }
      }
    });
    const modes = result["_brandModes"];
    expect(modes).toBeDefined();
    expect(typeof modes).toBe("object");
  });
  test("brand metadata is attached to _brand key", () => {
    const result = createBrandTheme(baseTree, {
      name: "my-brand",
      displayName: "My Brand"
    });
    const meta = result["_brand"];
    expect(meta["name"]).toBe("my-brand");
    expect(meta["displayName"]).toBe("My Brand");
  });
  test("nested dot-path overrides create intermediate groups", () => {
    const emptyBase = {};
    const result = createBrandTheme(emptyBase, {
      name: "nested-brand",
      semanticOverrides: {
        "color.text.primary": "#000000"
      }
    });
    const colorGroup = result["color"];
    expect(colorGroup).toBeDefined();
    const textGroup = colorGroup["text"];
    expect(textGroup).toBeDefined();
    const primaryToken = textGroup["primary"];
    expect(primaryToken.$value).toBe("#000000");
  });
});
describe("resolveBrandChain", () => {
  test("single brand with no extends returns itself", () => {
    const brands = {
      root: {
        name: "root",
        displayName: "Root Brand",
        semanticOverrides: { "color.action.primary": "#ff0000" }
      }
    };
    const resolved = resolveBrandChain("root", brands);
    expect(resolved.name).toBe("root");
    expect(resolved.semanticOverrides?.["color.action.primary"]).toBe("#ff0000");
  });
  test("single parent resolution", () => {
    const brands = {
      parent: {
        name: "parent",
        semanticOverrides: {
          "color.action.primary": "#0000ff",
          "color.text.primary": "#111111"
        }
      },
      child: {
        name: "child",
        extends: "parent",
        semanticOverrides: {
          "color.action.primary": "#ff0000"
        }
      }
    };
    const resolved = resolveBrandChain("child", brands);
    expect(resolved.name).toBe("child");
    expect(resolved.semanticOverrides?.["color.action.primary"]).toBe("#ff0000");
    expect(resolved.semanticOverrides?.["color.text.primary"]).toBe("#111111");
  });
  test("multi-level chain (grandparent → parent → child)", () => {
    const brands = {
      grandparent: {
        name: "grandparent",
        semanticOverrides: {
          "color.action.primary": "#0000ff",
          "color.text.primary": "#111111",
          "radius.md": "4px"
        }
      },
      parent: {
        name: "parent",
        extends: "grandparent",
        semanticOverrides: {
          "color.action.primary": "#00ff00"
        }
      },
      child: {
        name: "child",
        extends: "parent",
        semanticOverrides: {
          "radius.md": "8px"
        }
      }
    };
    const resolved = resolveBrandChain("child", brands);
    expect(resolved.name).toBe("child");
    expect(resolved.semanticOverrides?.["radius.md"]).toBe("8px");
    expect(resolved.semanticOverrides?.["color.action.primary"]).toBe("#00ff00");
    expect(resolved.semanticOverrides?.["color.text.primary"]).toBe("#111111");
  });
  test("circular reference throws", () => {
    const brands = {
      a: { name: "a", extends: "b" },
      b: { name: "b", extends: "a" }
    };
    expect(() => resolveBrandChain("a", brands)).toThrow(/Circular brand inheritance/);
  });
  test("self-referencing extends throws", () => {
    const brands = {
      self: { name: "self", extends: "self" }
    };
    expect(() => resolveBrandChain("self", brands)).toThrow(/Circular brand inheritance/);
  });
  test("dangling extends reference throws", () => {
    const brands = {
      child: { name: "child", extends: "nonexistent" }
    };
    expect(() => resolveBrandChain("child", brands)).toThrow(/not found in brand registry/);
  });
  test("extends: null works as explicit root", () => {
    const brands = {
      root: {
        name: "root",
        extends: null,
        semanticOverrides: { "color.action.primary": "#ff0000" }
      }
    };
    const resolved = resolveBrandChain("root", brands);
    expect(resolved.name).toBe("root");
    expect(resolved.semanticOverrides?.["color.action.primary"]).toBe("#ff0000");
  });
  test("child overrides beat parent", () => {
    const brands = {
      parent: {
        name: "parent",
        componentOverrides: { "button.radius": "4px" }
      },
      child: {
        name: "child",
        extends: "parent",
        componentOverrides: { "button.radius": "9999px" }
      }
    };
    const resolved = resolveBrandChain("child", brands);
    expect(resolved.componentOverrides?.["button.radius"]).toBe("9999px");
  });
  test("mode overrides merge across chain", () => {
    const brands = {
      parent: {
        name: "parent",
        modes: {
          dark: { "color.action.primary": "#aaa" },
          compact: { "spacing.gap": "4px" }
        }
      },
      child: {
        name: "child",
        extends: "parent",
        modes: {
          dark: { "color.action.primary": "#bbb", "color.bg": "#000" }
        }
      }
    };
    const resolved = resolveBrandChain("child", brands);
    expect(resolved.modes?.["dark"]?.["color.action.primary"]).toBe("#bbb");
    expect(resolved.modes?.["dark"]?.["color.bg"]).toBe("#000");
    expect(resolved.modes?.["compact"]?.["spacing.gap"]).toBe("4px");
  });
  test("primitives merge across chain", () => {
    const brands = {
      parent: {
        name: "parent",
        primitives: {
          color: { primary: "#0000ff", secondary: "#00ff00" },
          backgrounds: { light: "#fff" }
        }
      },
      child: {
        name: "child",
        extends: "parent",
        primitives: {
          color: { primary: "#ff0000" },
          backgrounds: { dark: "#000" }
        }
      }
    };
    const resolved = resolveBrandChain("child", brands);
    expect(resolved.primitives?.color?.["primary"]).toBe("#ff0000");
    expect(resolved.primitives?.color?.["secondary"]).toBe("#00ff00");
    expect(resolved.primitives?.backgrounds?.light).toBe("#fff");
    expect(resolved.primitives?.backgrounds?.dark).toBe("#000");
  });
});
describe("createAllBrandThemes", () => {
  test("creates themed trees for all brands", () => {
    const brands = {
      "brand-a": {
        name: "brand-a",
        semanticOverrides: { "color.action.primary": "{color.blue.500}" }
      },
      "brand-b": {
        name: "brand-b",
        semanticOverrides: { "color.action.primary": "{color.brand.600}" }
      }
    };
    const themes = createAllBrandThemes(baseTree, brands);
    expect(Object.keys(themes)).toEqual(["brand-a", "brand-b"]);
    const aToken = themes["brand-a"]["color"]["action"]["primary"];
    expect(aToken.$value).toBe("{color.blue.500}");
    const bToken = themes["brand-b"]["color"]["action"]["primary"];
    expect(bToken.$value).toBe("{color.brand.600}");
  });
  test("resolves inheritance across all brands", () => {
    const brands = {
      base: {
        name: "base",
        semanticOverrides: { "radius.md": "4px" }
      },
      derived: {
        name: "derived",
        extends: "base",
        componentOverrides: { "button.radius": "{radius.full}" }
      }
    };
    const themes = createAllBrandThemes(baseTree, brands);
    const derivedRadius = themes["derived"]["radius"]["md"];
    expect(derivedRadius.$value).toBe("4px");
    const derivedBtn = themes["derived"]["button"]["radius"];
    expect(derivedBtn.$value).toBe("{radius.full}");
  });
});
