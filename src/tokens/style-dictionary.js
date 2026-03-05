// @ts-check

/**
 * SigUI CLI tokens module for style dictionary.
 * @module
 */
/**
 * generateStyleDictionaryConfig.
 * @param {{
    buildPath?: string;
    outputReferences?: boolean;
  }} options
 * @returns {StyleDictionaryConfig}
 */
export function generateStyleDictionaryConfig(options = {}) {
  const buildPath = options.buildPath ?? "build/";
  const outputReferences = options.outputReferences ?? true;
  return {
    source: ["tokens/**/*.json"],
    platforms: {
      css: {
        transformGroup: "css",
        buildPath,
        files: [
          {
            destination: "variables.css",
            format: "css/variables",
            options: { outputReferences }
          }
        ]
      },
      js: {
        transformGroup: "js",
        buildPath,
        files: [
          {
            destination: "tokens.js",
            format: "javascript/es6"
          }
        ]
      },
      ts: {
        transformGroup: "js",
        buildPath,
        files: [
          {
            destination: "tokens.d.ts",
            format: "typescript/es6-declarations"
          }
        ]
      },
      json: {
        transformGroup: "js",
        buildPath,
        files: [
          {
            destination: "tokens.json",
            format: "json/flat"
          }
        ]
      }
    }
  };
}
