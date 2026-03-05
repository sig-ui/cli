// @ts-check

/**
 * Repository module for resolve.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import { resolveComponents } from "../../src/registry/resolve.js";
function makeRegistry(components, lib = {}) {
  return {
    version: 1,
    meta: { raw: "https://example.com" },
    lib,
    components
  };
}
describe("resolveComponents", () => {
  test("resolves a single component with no deps", () => {
    const reg = makeRegistry({
      card: {
        name: "Card",
        dir: "Card",
        files: ["card.js", "card.css", "index.js"],
        componentDeps: [],
        libDeps: ["types.js"],
        npmDeps: ["@sig-ui/core"]
      }
    });
    const result = resolveComponents(reg, ["card"]);
    expect(result.components.size).toBe(1);
    expect(result.components.has("card")).toBe(true);
    expect(result.libFiles).toEqual(new Set(["types.js"]));
    expect(result.npmDeps).toEqual(new Set(["@sig-ui/core"]));
  });
  test("resolves transitive component deps", () => {
    const reg = makeRegistry({
      button: {
        name: "Button",
        dir: "Button",
        files: ["button.js", "index.js"],
        componentDeps: ["button-group"],
        libDeps: ["types.js", "use-machine.js"],
        npmDeps: ["@sig-ui/core"]
      },
      "button-group": {
        name: "ButtonGroup",
        dir: "ButtonGroup",
        files: ["button-group.js", "index.js"],
        componentDeps: [],
        libDeps: ["types.js"],
        npmDeps: []
      }
    });
    const result = resolveComponents(reg, ["button"]);
    expect(result.components.size).toBe(2);
    expect(result.components.has("button")).toBe(true);
    expect(result.components.has("button-group")).toBe(true);
  });
  test("deduplicates shared deps", () => {
    const reg = makeRegistry({
      dialog: {
        name: "Dialog",
        dir: "Dialog",
        files: ["dialog-root.js"],
        componentDeps: [],
        libDeps: ["types.js", "use-id.js"],
        npmDeps: ["@sig-ui/core"]
      },
      select: {
        name: "Select",
        dir: "Select",
        files: ["select-root.js"],
        componentDeps: [],
        libDeps: ["types.js", "use-id.js"],
        npmDeps: ["@sig-ui/core"]
      }
    });
    const result = resolveComponents(reg, ["dialog", "select"]);
    expect(result.components.size).toBe(2);
    expect(result.libFiles).toEqual(new Set(["types.js", "use-id.js"]));
    expect(result.npmDeps).toEqual(new Set(["@sig-ui/core"]));
  });
  test("collects npm deps from lib files", () => {
    const reg = makeRegistry({
      button: {
        name: "Button",
        dir: "Button",
        files: ["button.js"],
        componentDeps: [],
        libDeps: ["use-machine.js"],
        npmDeps: []
      }
    }, {
      "use-machine.js": {
        source: "lib/use-machine.js",
        npmDeps: ["@sig-ui/core"]
      }
    });
    const result = resolveComponents(reg, ["button"]);
    expect(result.npmDeps).toContain("@sig-ui/core");
  });
  test("handles deep transitive chains", () => {
    const reg = makeRegistry({
      a: {
        name: "A",
        dir: "A",
        files: ["a.js"],
        componentDeps: ["b"],
        libDeps: [],
        npmDeps: []
      },
      b: {
        name: "B",
        dir: "B",
        files: ["b.js"],
        componentDeps: ["c"],
        libDeps: [],
        npmDeps: []
      },
      c: {
        name: "C",
        dir: "C",
        files: ["c.js"],
        componentDeps: [],
        libDeps: ["types.js"],
        npmDeps: ["@sig-ui/core"]
      }
    });
    const result = resolveComponents(reg, ["a"]);
    expect(result.components.size).toBe(3);
    expect(result.components.has("a")).toBe(true);
    expect(result.components.has("b")).toBe(true);
    expect(result.components.has("c")).toBe(true);
    expect(result.libFiles).toEqual(new Set(["types.js"]));
    expect(result.npmDeps).toEqual(new Set(["@sig-ui/core"]));
  });
  test("handles circular deps without infinite loop", () => {
    const reg = makeRegistry({
      a: {
        name: "A",
        dir: "A",
        files: ["a.js"],
        componentDeps: ["b"],
        libDeps: [],
        npmDeps: []
      },
      b: {
        name: "B",
        dir: "B",
        files: ["b.js"],
        componentDeps: ["a"],
        libDeps: [],
        npmDeps: []
      }
    });
    const result = resolveComponents(reg, ["a"]);
    expect(result.components.size).toBe(2);
  });
  test("throws for unknown component", () => {
    const reg = makeRegistry({});
    expect(() => resolveComponents(reg, ["nonexistent"])).toThrow('Component "nonexistent" not found in registry');
  });
});
