// @ts-check

/**
 * SigUI CLI checks module for phase4.
 * @module
 */
import { manifest } from "@sig-ui/components/manifest";
import { generateBundleCSS } from "../generators/bundle.js";
const TOKEN_PROP_PATTERNS = {
  ColorVariant: [
    "--sg-color-primary",
    "--sg-color-secondary",
    "--sg-color-danger",
    "--sg-color-success",
    "--sg-color-warning",
    "--sg-color-info"
  ],
  Size: [
    "--sg-space-"
  ]
};
/**
 * checkTokenContracts.
 * @param {string} css
 * @returns {Diagnostic[]}
 */
export function checkTokenContracts(css) {
  const diagnostics = [];
  const declaredTokens = new Set;
  const tokenDeclRegex = /(--sg-[a-z0-9-]+)\s*:/g;
  let match;
  while ((match = tokenDeclRegex.exec(css)) !== null) {
    declaredTokens.add(match[1]);
  }
  const allDeclRegex = /(--[a-z0-9-]+)\s*:/g;
  while ((match = allDeclRegex.exec(css)) !== null) {
    declaredTokens.add(match[1]);
  }
  let missingCount = 0;
  for (const component of manifest) {
    for (const [propName, propDesc] of Object.entries(component.props)) {
      const patterns = TOKEN_PROP_PATTERNS[propDesc.type];
      if (!patterns)
        continue;
      for (const pattern of patterns) {
        const found = [...declaredTokens].some((token) => token.startsWith(pattern));
        if (!found) {
          missingCount++;
          diagnostics.push({
            phase: "component",
            rule: "tokens/contract",
            severity: "warning",
            message: `${component.name}.${propName} expects token pattern "${pattern}" but it's missing from CSS output`,
            spec: "07",
            section: "§3"
          });
        }
      }
    }
  }
  if (missingCount === 0) {
    diagnostics.push({
      phase: "component",
      rule: "tokens/contract",
      severity: "info",
      message: `All component token contracts satisfied (${manifest.length} components checked)`,
      spec: "07"
    });
  }
  return diagnostics;
}
/**
 * runPhase4.
 * @param {SiguiConfig} config
 * @returns {Promise<Diagnostic[]>}
 */
export async function runPhase4(config) {
  const diagnostics = [];
  let css;
  try {
    css = await generateBundleCSS(config);
  } catch (e) {
    diagnostics.push({
      phase: "component",
      rule: "component/generate",
      severity: "error",
      message: `Failed to generate CSS bundle: ${e instanceof Error ? e.message : String(e)}`
    });
    return diagnostics;
  }
  diagnostics.push(...checkTokenContracts(css));
  return diagnostics;
}
