// @ts-check

/**
 * SigUI CLI tokens module for migrate.
 * @module
 */
const ALIAS_RE = /^\{(.+)\}$/;
function isAlias(value) {
  return typeof value === "string" && ALIAS_RE.test(value);
}
function isToken(node) {
  return node !== null && typeof node === "object" && "$value" in node;
}
function flattenTree(node, segments, inheritedType, out) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$") || key.startsWith("_"))
      continue;
    if (value === null || typeof value !== "object")
      continue;
    const child = value;
    const childSegments = [...segments, key];
    if (isToken(child)) {
      const resolvedType = child.$type ?? inheritedType;
      out[childSegments.join(".")] = {
        value: child.$value,
        type: resolvedType
      };
    } else {
      const groupType = "$type" in child ? child.$type : undefined;
      flattenTree(child, childSegments, groupType ?? inheritedType, out);
    }
  }
}
function snapshotTree(tree) {
  const out = {};
  flattenTree(tree, [], undefined, out);
  return out;
}
/**
 * diffTokenSets.
 * @param {DTCGGroup} oldTokens
 * @param {DTCGGroup} newTokens
 * @returns {TokenDiff}
 */
export function diffTokenSets(oldTokens, newTokens) {
  const oldFlat = snapshotTree(oldTokens);
  const newFlat = snapshotTree(newTokens);
  const added = [];
  const removed = [];
  const changed = [];
  const oldPaths = new Set(Object.keys(oldFlat));
  const newPaths = new Set(Object.keys(newFlat));
  for (const path of newPaths) {
    if (!oldPaths.has(path)) {
      const snap = newFlat[path];
      added.push({ kind: "added", path, value: snap.value, type: snap.type });
    }
  }
  for (const path of oldPaths) {
    const oldSnap = oldFlat[path];
    if (!newPaths.has(path)) {
      removed.push({
        kind: "removed",
        path,
        value: oldSnap.value,
        type: oldSnap.type
      });
    } else {
      const newSnap = newFlat[path];
      const valueChanged = JSON.stringify(oldSnap.value) !== JSON.stringify(newSnap.value);
      const typeChanged = oldSnap.type !== newSnap.type;
      if (valueChanged || typeChanged) {
        changed.push({
          kind: "changed",
          path,
          previousValue: oldSnap.value,
          currentValue: newSnap.value,
          previousType: oldSnap.type,
          currentType: newSnap.type
        });
      }
    }
  }
  return { added, removed, changed };
}
/**
 * detectBreakingChanges.
 * @param {TokenDiff} diff
 * @returns {BreakingChange[]}
 */
export function detectBreakingChanges(diff) {
  const breaking = [];
  for (const entry of diff.removed) {
    breaking.push({ kind: "removal", path: entry.path });
  }
  for (const entry of diff.changed) {
    const typeChanged = entry.previousType !== entry.currentType && entry.previousType !== undefined && entry.currentType !== undefined;
    if (typeChanged) {
      breaking.push({
        kind: "typeChange",
        path: entry.path,
        previousType: entry.previousType,
        currentType: entry.currentType
      });
    }
    const wasAlias = isAlias(entry.previousValue);
    const isNowAlias = isAlias(entry.currentValue);
    if (wasAlias !== isNowAlias) {
      breaking.push({
        kind: "aliasStructureChange",
        path: entry.path,
        wasAlias,
        isNowAlias
      });
    }
  }
  return breaking;
}
/**
 * generateDeprecationNotice.
 * @param {DTCGGroup} tokenTree
 * @param {string} tokenPath
 * @param {string} replacement
 * @param {string} removeInVersion
 * @returns {DTCGGroup}
 */
export function generateDeprecationNotice(tokenTree, tokenPath, replacement, removeInVersion) {
  const parts = tokenPath.split(".");
  let current = tokenTree;
  for (let i = 0;i < parts.length - 1; i++) {
    const part = parts[i];
    const next = current[part];
    if (next === null || typeof next !== "object") {
      throw new Error(`Token path "${tokenPath}" not found: segment "${part}" is missing.`);
    }
    current = next;
  }
  const lastKey = parts[parts.length - 1];
  const token = current[lastKey];
  if (!isToken(token)) {
    throw new Error(`Token path "${tokenPath}" not found or is not a leaf token.`);
  }
  const mutable = token;
  const existingExt = mutable["$extensions"] ?? {};
  const existingSigui = existingExt["com.sigui"] ?? {};
  const updatedSigui = {
    ...existingSigui,
    deprecatedSince: "next"
  };
  if (replacement !== undefined) {
    updatedSigui["replacedBy"] = replacement;
  }
  if (removeInVersion !== undefined) {
    updatedSigui["removalTarget"] = removeInVersion;
  }
  mutable["$extensions"] = {
    ...existingExt,
    "com.sigui": updatedSigui
  };
  return tokenTree;
}
