// @ts-check

/**
 * SigUI CLI commands module for build.
 * @module
 */
import * as path from "node:path";
import * as fs from "node:fs";
import { loadConfig } from "../config/load.js";
import { generateTokenCSS } from "../generators/css.js";
import { generateSplitCSS } from "../generators/split-css.js";
import { generateBundleCSS } from "../generators/bundle.js";
import { minifyCSS } from "../generators/minify-css.js";
import { generateTypeScriptTokens } from "../generators/typescript.js";
import { generateJSONTokens } from "../generators/json.js";
import {
  scanProjectForTokenUsage,
  treeShakeCSS,
  buildComponentClassMap,
  scanProjectForComponentUsage,
  resolveUsedClasses,
  treeShakeComponentCSS
} from "../generators/treeshake.js";
import { resolveStylesDir } from "../generators/bundle.js";
import * as log from "../utils/log.js";
/**
 * build.
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export async function build(args) {
  const cwd = process.cwd();
  const watch = args.includes("--watch") || args.includes("-w");
  await buildTokens(cwd);
  if (watch) {
    log.info("Watching for config changes...");
    watchConfig(cwd);
  }
}
/**
 * buildTokens.
 * @param {string} cwd
 * @returns {Promise<void>}
 */
export async function buildTokens(cwd) {
  const config = await loadConfig(cwd);
  const outputDir = path.join(cwd, config.output?.dir ?? "src/sigui");
  const shouldMinify = config.output?.minify === true;
  const postprocess = shouldMinify ? minifyCSS : (css) => css;
  log.info("Generating design system...");
  const outputRelDir = config.output?.dir ?? "src/sigui";
  const excludeDirs = ["node_modules", ".git", "dist", "build", ".next", ".nuxt", outputRelDir];
  let sourceRefs;
  let componentUsage;
  if (config.output?.treeShake) {
    log.info("Scanning project for token usage...");
    [sourceRefs, componentUsage] = await Promise.all([
      scanProjectForTokenUsage(cwd, { exclude: excludeDirs }),
      scanProjectForComponentUsage(cwd, { exclude: excludeDirs })
    ]);
  }
  if (config.output?.splitFiles) {
    const split = generateSplitCSS(config);
    const writes = [
      ["primitives.css", split.primitives],
      ["semantic-light.css", split.semanticLight],
      ["semantic-dark.css", split.semanticDark],
      ["components.css", split.components],
      ["high-contrast.css", split.highContrast],
      ["all.css", split.all]
    ];
    for (const [name, css] of Object.entries(split.brands)) {
      writes.push([`brand-${name}.css`, css]);
    }
    for (const [name, css] of Object.entries(split.densities)) {
      writes.push([`density-${name}.css`, css]);
    }
    for (const [filename, content] of writes) {
      const processed = postprocess(content);
      const filePath = path.join(outputDir, filename);
      await Bun.write(filePath, processed);
      log.success(`Written ${path.relative(cwd, filePath)} (${(processed.length / 1024).toFixed(1)}KB)`);
    }
  }
  let tokenCSS = generateTokenCSS(config);
  if (sourceRefs) {
    const result = treeShakeCSS(tokenCSS, sourceRefs);
    tokenCSS = result.css;
    log.info(`tokens.css: tree-shook ${result.stats.removed}/${result.stats.total} unused properties`);
  }
  tokenCSS = postprocess(tokenCSS);
  const tokensPath = path.join(outputDir, "tokens.css");
  await Bun.write(tokensPath, tokenCSS);
  log.success(`Written ${path.relative(cwd, tokensPath)} (${(tokenCSS.length / 1024).toFixed(1)}KB)`);
  let bundleCSS = await generateBundleCSS(config);
  if (sourceRefs) {
    const result = treeShakeCSS(bundleCSS, sourceRefs);
    bundleCSS = result.css;
    log.info(`sigui.css: tree-shook ${result.stats.removed}/${result.stats.total} unused properties`);
  }
  if (componentUsage) {
    const stylesDir = resolveStylesDir();
    const baseCSSContent = await Bun.file(path.join(stylesDir, "base.css")).text();
    const classMap = buildComponentClassMap(baseCSSContent);
    const usedClasses = resolveUsedClasses(componentUsage.components, componentUsage.directClasses, classMap);
    const result = treeShakeComponentCSS(bundleCSS, usedClasses);
    bundleCSS = result.css;
    log.info(`sigui.css: tree-shook ${result.stats.removed}/${result.stats.total} unused component rules`);
  }
  bundleCSS = postprocess(bundleCSS);
  const bundlePath = path.join(outputDir, "sigui.css");
  await Bun.write(bundlePath, bundleCSS);
  log.success(`Written ${path.relative(cwd, bundlePath)} (${(bundleCSS.length / 1024).toFixed(1)}KB)`);
  if (config.output?.typescript) {
    const tsContent = generateTypeScriptTokens(config);
    const tsPath = path.join(outputDir, "tokens.ts");
    await Bun.write(tsPath, tsContent);
    log.success(`Written ${path.relative(cwd, tsPath)} (${(tsContent.length / 1024).toFixed(1)}KB)`);
  }
  if (config.output?.json) {
    const jsonContent = generateJSONTokens(config);
    const jsonPath = path.join(outputDir, "tokens.json");
    await Bun.write(jsonPath, jsonContent);
    log.success(`Written ${path.relative(cwd, jsonPath)} (${(jsonContent.length / 1024).toFixed(1)}KB)`);
  }
}
function watchConfig(cwd) {
  const configNames = ["sigui.config.ts", "sigui.config.js", "sigui.config.mjs"];
  let debounce = null;
  const watcher = fs.watch(cwd, { persistent: true }, (eventType, filename) => {
    if (!filename || !configNames.includes(filename))
      return;
    if (debounce)
      clearTimeout(debounce);
    debounce = setTimeout(async () => {
      log.info("Config changed, rebuilding...");
      try {
        await buildTokens(cwd);
      } catch (err) {
        log.error(`Build failed: ${err}`);
      }
    }, 200);
  });
  process.on("SIGINT", () => {
    watcher.close();
    process.exit(0);
  });
}
