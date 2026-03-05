// @ts-check

/**
 * SigUI CLI tokens module for build.
 * @module
 */
import { resolveAllTokens } from "./resolve.js";
const ALIAS_RE = /^\{(.+)\}$/;
const OKLCH_RE = /^oklch\(/i;
function toCSSVarName(path, prefix = "") {
  const kebab = path.replace(/\./g, "-");
  return prefix ? `--${prefix}-${kebab}` : `--${kebab}`;
}
function toTSIdentifier(path) {
  return path.split(/[.\-]/).map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)).join("").replace(/[^a-zA-Z0-9_$]/g, "_");
}
function isToken(node) {
  return node !== null && typeof node === "object" && "$value" in node;
}
function extractAliasPath(value) {
  if (typeof value !== "string")
    return null;
  const match = ALIAS_RE.exec(value);
  return match ? match[1] ?? null : null;
}
function walkTokens(node, segments, fn, inheritedType) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$"))
      continue;
    if (value === null || typeof value !== "object")
      continue;
    const child = value;
    const childSegments = [...segments, key];
    if (isToken(child)) {
      fn(childSegments.join("."), child, child.$type ?? inheritedType);
    } else {
      const groupType = "$type" in child ? child.$type : undefined;
      walkTokens(child, childSegments, fn, groupType ?? inheritedType);
    }
  }
}
function valueToCSSString(value, type) {
  if (typeof value === "string")
    return value;
  if (typeof value === "number")
    return String(value);
  if (Array.isArray(value)) {
    if (value.length === 4 && value.every((v) => typeof v === "number")) {
      return `cubic-bezier(${value.join(", ")})`;
    }
    if (value.length > 0 && typeof value[0] === "object") {
      return value.map(shadowToCSS).join(", ");
    }
    return value.join(", ");
  }
  if (typeof value === "object" && value !== null) {
    const obj = value;
    if ("offsetX" in obj)
      return shadowToCSS(obj);
    if ("duration" in obj && "timingFunction" in obj) {
      const tf = obj.timingFunction;
      const tfStr = Array.isArray(tf) ? `cubic-bezier(${tf.join(", ")})` : String(tf);
      const delay = obj.delay ? ` ${String(obj.delay)}` : "";
      return `${String(obj.duration)}${delay} ${tfStr}`;
    }
  }
  return String(value);
}
function shadowToCSS(s) {
  return `${s.offsetX} ${s.offsetY} ${s.blur} ${s.spread} ${s.color}`;
}
/**
 * buildCSS.
 * @param {DTCGGroup} tokenTree
 * @param {BuildCSSOptions} options
 * @returns {string}
 */
export function buildCSS(tokenTree, options = {}) {
  const {
    prefix = "",
    darkModeTokens,
    densityVariants,
    breakpointOverrides,
    selector = ":root"
  } = options;
  const baseLines = [];
  const oklchLines = [];
  walkTokens(tokenTree, [], (path, token, resolvedType) => {
    const varName = toCSSVarName(path, prefix);
    const value = token.$value;
    const aliasPath = extractAliasPath(value);
    if (aliasPath !== null) {
      const refVar = toCSSVarName(aliasPath, prefix);
      baseLines.push(`  ${varName}: var(${refVar});`);
    } else {
      const cssValue = valueToCSSString(value, resolvedType);
      const isColor = resolvedType === "color" || !resolvedType && typeof cssValue === "string" && cssValue.startsWith("#");
      const isOklch = OKLCH_RE.test(String(cssValue));
      if (isColor && isOklch) {
        const srgbFallback = token.$extensions?.["com.sigui"]?.srgbFallback;
        baseLines.push(`  ${varName}: ${srgbFallback ?? cssValue};`);
        oklchLines.push(`    ${varName}: ${cssValue};`);
      } else {
        baseLines.push(`  ${varName}: ${cssValue};`);
      }
    }
  });
  const parts = [];
  parts.push(`${selector} {`);
  parts.push(...baseLines);
  parts.push(`}`);
  if (oklchLines.length > 0) {
    parts.push(``);
    parts.push(`@supports (color: oklch(0 0 0)) {`);
    parts.push(`  ${selector} {`);
    parts.push(...oklchLines);
    parts.push(`  }`);
    parts.push(`}`);
  }
  if (darkModeTokens && Object.keys(darkModeTokens).length > 0) {
    const darkBaseLines = [];
    const darkOklchLines = [];
    for (const [path, value] of Object.entries(darkModeTokens)) {
      const varName = toCSSVarName(path, prefix);
      const aliasPath = extractAliasPath(value);
      if (aliasPath !== null) {
        darkBaseLines.push(`    ${varName}: var(${toCSSVarName(aliasPath, prefix)});`);
      } else {
        const isOklch = OKLCH_RE.test(value);
        if (isOklch) {
          darkBaseLines.push(`    ${varName}: ${value};`);
          darkOklchLines.push(`      ${varName}: ${value};`);
        } else {
          darkBaseLines.push(`    ${varName}: ${value};`);
        }
      }
    }
    parts.push(``);
    parts.push(`@media (prefers-color-scheme: dark) {`);
    parts.push(`  ${selector} {`);
    parts.push(...darkBaseLines);
    parts.push(`  }`);
    parts.push(`}`);
    if (darkOklchLines.length > 0) {
      parts.push(``);
      parts.push(`@supports (color: oklch(0 0 0)) {`);
      parts.push(`  @media (prefers-color-scheme: dark) {`);
      parts.push(`    ${selector} {`);
      parts.push(...darkOklchLines);
      parts.push(`    }`);
      parts.push(`  }`);
      parts.push(`}`);
    }
  }
  if (densityVariants) {
    const densityScalars = {
      compact: "0.75",
      comfortable: "1",
      spacious: "1.5"
    };
    for (const [variant, overrides] of Object.entries(densityVariants)) {
      if (!overrides || Object.keys(overrides).length === 0)
        continue;
      const density = variant;
      const scalar = densityScalars[density];
      parts.push(``);
      parts.push(`[data-density="${density}"] {`);
      parts.push(`  --density: ${scalar};`);
      for (const [path, value] of Object.entries(overrides)) {
        const varName = toCSSVarName(path, prefix);
        const aliasPath = extractAliasPath(value);
        if (aliasPath !== null) {
          parts.push(`  ${varName}: var(${toCSSVarName(aliasPath, prefix)});`);
        } else {
          parts.push(`  ${varName}: ${value};`);
        }
      }
      parts.push(`}`);
    }
  }
  if (breakpointOverrides) {
    for (const [breakpoint, overrides] of Object.entries(breakpointOverrides)) {
      if (!overrides || Object.keys(overrides).length === 0)
        continue;
      const minWidth = /^\d+$/.test(breakpoint) ? `${breakpoint}px` : breakpoint;
      parts.push(``);
      parts.push(`@media (min-width: ${minWidth}) {`);
      parts.push(`  ${selector} {`);
      for (const [path, value] of Object.entries(overrides)) {
        const varName = toCSSVarName(path, prefix);
        const aliasPath = extractAliasPath(value);
        if (aliasPath !== null) {
          parts.push(`    ${varName}: var(${toCSSVarName(aliasPath, prefix)});`);
        } else {
          parts.push(`    ${varName}: ${value};`);
        }
      }
      parts.push(`  }`);
      parts.push(`}`);
    }
  }
  return parts.join(`
`) + `
`;
}
/**
 * buildJSON.
 * @param {DTCGGroup} tokenTree
 * @param {BuildJSONOptions} options
 * @returns {string}
 */
export function buildJSON(tokenTree, options = {}) {
  const { include, resolve: shouldResolve = true } = options;
  let flat;
  if (shouldResolve) {
    flat = resolveAllTokens(tokenTree);
  } else {
    flat = {};
    walkTokens(tokenTree, [], (path, token) => {
      flat[path] = token.$value;
    });
  }
  if (include && include.length > 0) {
    const filtered = {};
    for (const [key, value] of Object.entries(flat)) {
      if (include.some((prefix) => key.startsWith(prefix))) {
        filtered[key] = value;
      }
    }
    flat = filtered;
  }
  return JSON.stringify(flat, null, 2);
}
/**
 * buildTypeScript.
 * @param {DTCGGroup} tokenTree
 * @param {BuildTypeScriptOptions} options
 * @returns {string}
 */
export function buildTypeScript(tokenTree, options = {}) {
  const { moduleDoc, exportStyle = "named" } = options;
  const resolved = resolveAllTokens(tokenTree);
  const lines = [];
  if (moduleDoc) {
    lines.push(`/**`);
    lines.push(` * ${moduleDoc}`);
    lines.push(` */`);
    lines.push(``);
  } else {
    lines.push(`/**`);
    lines.push(` * Generated design token constants - do not edit manually.`);
    lines.push(` * Generated by @sig-ui/tokens`);
    lines.push(` */`);
    lines.push(``);
  }
  if (exportStyle === "object") {
    lines.push(`export const tokens = {`);
    for (const [path, value] of Object.entries(resolved)) {
      const identifier = JSON.stringify(path);
      lines.push(`  /** ${path} */`);
      lines.push(`  ${identifier}: ${serializeTS(value)} as const,`);
    }
    lines.push(`} as const;`);
    lines.push(``);
    lines.push(`export type TokenKey = keyof typeof tokens;`);
    lines.push(`export type TokenValue = (typeof tokens)[TokenKey];`);
  } else {
    for (const [path, value] of Object.entries(resolved)) {
      const identifier = toTSIdentifier(path);
      lines.push(`/** Token: ${path} */`);
      lines.push(`export const ${identifier} = ${serializeTS(value)} as const;`);
    }
  }
  return lines.join(`
`) + `
`;
}
function serializeTS(value) {
  if (typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number")
    return String(value);
  if (typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(serializeTS).join(", ")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${serializeTS(v)}`);
    return `{ ${entries.join(", ")} }`;
  }
  return JSON.stringify(value);
}
