// @ts-check

/**
 * SigUI CLI tokens module for validate.
 * @module
 */
const VALID_DTCG_TYPES = new Set([
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
  "strokeStyle",
  "border",
  "transition",
  "shadow",
  "gradient",
  "typography"
]);
const ALIAS_RE = /^\{(.+)\}$/;
function isToken(node) {
  return node !== null && typeof node === "object" && "$value" in node;
}
function extractAliasPath(value) {
  if (typeof value !== "string")
    return null;
  const match = ALIAS_RE.exec(value);
  return match ? match[1] ?? null : null;
}
function lookupPath(tree, path) {
  const parts = path.split(".");
  let current = tree;
  for (const part of parts) {
    if (current === null || typeof current !== "object")
      return;
    current = current[part];
    if (current === undefined)
      return;
  }
  return current;
}
function walkTokens(node, segments, fn, inheritedType) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$") || key.startsWith("_"))
      continue;
    if (value === null || typeof value !== "object")
      continue;
    const child = value;
    const childSegments = [...segments, key];
    if (isToken(child)) {
      fn(childSegments.join("."), child, inheritedType);
    } else {
      const groupType = "$type" in child ? child.$type : undefined;
      walkTokens(child, childSegments, fn, groupType ?? inheritedType);
    }
  }
}
function traceAlias(startPath, tree, visited) {
  const chain = [];
  let current = startPath;
  while (true) {
    if (visited.has(current)) {
      chain.push(current);
      return { kind: "circular", cycle: [...chain] };
    }
    const node = lookupPath(tree, current);
    if (node === undefined || !isToken(node)) {
      return { kind: "dangling", path: current };
    }
    const aliasPath = extractAliasPath(node.$value);
    if (aliasPath === null) {
      return null;
    }
    visited.add(current);
    chain.push(current);
    current = aliasPath;
  }
}
/**
 * validateDTCG.
 * @param {DTCGGroup} tokenTree
 * @returns {ValidationResult}
 */
export function validateDTCG(tokenTree) {
  const errors = [];
  const allTokenPaths = new Set;
  walkTokens(tokenTree, [], (path) => {
    allTokenPaths.add(path);
  });
  walkTokens(tokenTree, [], (path, token, inheritedType) => {
    if (token.$value === undefined) {
      errors.push({
        path,
        code: "MISSING_VALUE",
        message: `Token "${path}" is missing a $value.`
      });
      return;
    }
    const tokenType = token.$type;
    if (tokenType !== undefined) {
      if (!VALID_DTCG_TYPES.has(tokenType)) {
        errors.push({
          path,
          code: "INVALID_TYPE",
          message: `Token "${path}" has invalid $type "${String(tokenType)}". ` + `Must be one of: ${[...VALID_DTCG_TYPES].join(", ")}.`
        });
      }
    } else if (inheritedType !== undefined) {
      if (!VALID_DTCG_TYPES.has(inheritedType)) {
        errors.push({
          path,
          code: "INVALID_TYPE",
          message: `Token "${path}" inherits invalid $type "${inheritedType}" from its group. ` + `Must be one of: ${[...VALID_DTCG_TYPES].join(", ")}.`
        });
      }
    }
    const aliasPath = extractAliasPath(token.$value);
    if (aliasPath !== null) {
      const visited = new Set;
      visited.add(path);
      const problem = traceAlias(aliasPath, tokenTree, visited);
      if (problem !== null) {
        if (problem.kind === "circular") {
          errors.push({
            path,
            code: "CIRCULAR_REFERENCE",
            message: `Token "${path}" has a circular alias reference: ${problem.cycle.join(" -> ")}.`
          });
        } else {
          errors.push({
            path,
            code: "DANGLING_ALIAS",
            message: `Token "${path}" references "${problem.path}" which does not exist.`
          });
        }
      }
    }
  });
  return {
    valid: errors.length === 0,
    errors
  };
}
