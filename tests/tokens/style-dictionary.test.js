// @ts-check

/**
 * Repository module for style dictionary.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import { generateStyleDictionaryConfig } from "../../src/tokens/style-dictionary.js";
describe("generateStyleDictionaryConfig", () => {
  test("returns valid config structure", () => {
    const config = generateStyleDictionaryConfig();
    expect(config).toHaveProperty("source");
    expect(config).toHaveProperty("platforms");
    expect(config.source).toEqual(["tokens/**/*.json"]);
  });
  test("includes css, js, ts, and json platforms", () => {
    const config = generateStyleDictionaryConfig();
    expect(config.platforms).toHaveProperty("css");
    expect(config.platforms).toHaveProperty("js");
    expect(config.platforms).toHaveProperty("ts");
    expect(config.platforms).toHaveProperty("json");
  });
  test("css platform has correct format", () => {
    const config = generateStyleDictionaryConfig();
    const css = config.platforms.css;
    expect(css.transformGroup).toBe("css");
    expect(css.files[0].format).toBe("css/variables");
    expect(css.files[0].options?.outputReferences).toBe(true);
  });
  test("custom buildPath is applied to all platforms", () => {
    const config = generateStyleDictionaryConfig({ buildPath: "dist/tokens/" });
    for (const platform of Object.values(config.platforms)) {
      expect(platform.buildPath).toBe("dist/tokens/");
    }
  });
  test("outputReferences defaults to true", () => {
    const config = generateStyleDictionaryConfig();
    expect(config.platforms.css.files[0].options?.outputReferences).toBe(true);
  });
  test("outputReferences can be disabled", () => {
    const config = generateStyleDictionaryConfig({ outputReferences: false });
    expect(config.platforms.css.files[0].options?.outputReferences).toBe(false);
  });
  test("default buildPath is build/", () => {
    const config = generateStyleDictionaryConfig();
    expect(config.platforms.css.buildPath).toBe("build/");
  });
  test("json platform uses json/flat format", () => {
    const config = generateStyleDictionaryConfig();
    expect(config.platforms.json.files[0].format).toBe("json/flat");
  });
  test("ts platform generates declarations", () => {
    const config = generateStyleDictionaryConfig();
    expect(config.platforms.ts.files[0].format).toBe("typescript/es6-declarations");
    expect(config.platforms.ts.files[0].destination).toBe("tokens.d.ts");
  });
});
