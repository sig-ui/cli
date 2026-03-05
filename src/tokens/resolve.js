// @ts-check

/**
 * SigUI CLI tokens module for resolve.
 * @module
 */
export class CircularReferenceError extends Error {
  tokenPath;
  cycle;
  constructor(tokenPath, cycle) {
    const cycleList = [...cycle, tokenPath];
    super(`Circular reference detected: ${cycleList.join(" -> ")}`);
    this.name = "CircularReferenceError";
    this.tokenPath = tokenPath;
    this.cycle = cycleList;
  }
}

/**
 * MissingTokenError custom element class.
 * @extends {Error}
 */
export class MissingTokenError extends Error {
  tokenPath;
  constructor(tokenPath) {
    super(`Token not found: "${tokenPath}"`);
    this.name = "MissingTokenError";
    this.tokenPath = tokenPath;
  }
}
const ALIAS_RE = /^\{(.+)\}$/;
function lookupPath(tree, path) {
  const parts = path.split(".");
  let current = tree;
  for (const part of parts) {
    if (current === null || typeof current !== "object")
      return;
    const node = current[part];
    if (node === undefined)
      return;
    current = node;
  }
  return current;
}
function isToken(node) {
  return "$value" in node;
}
function extractAliasPath(value) {
  if (typeof value !== "string")
    return null;
  const match = ALIAS_RE.exec(value);
  return match ? match[1] ?? null : null;
}
const resolveCache = new WeakMap;
function getCache(tree) {
  let cache = resolveCache.get(tree);
  if (!cache) {
    cache = new Map;
    resolveCache.set(tree, cache);
  }
  return cache;
}
/**
 * resolveToken.
 * @param {string} path
 * @param {DTCGGroup} tokenTree
 * @returns {DTCGToken["$value"]}
 */
export function resolveToken(path, tokenTree) {
  const cache = getCache(tokenTree);
  if (cache.has(path))
    return cache.get(path);
  const value = _resolve(path, tokenTree, new Set);
  cache.set(path, value);
  return value;
}
function _resolve(path, tree, visited) {
  if (visited.has(path)) {
    throw new CircularReferenceError(path, visited);
  }
  const node = lookupPath(tree, path);
  if (node === undefined) {
    throw new MissingTokenError(path);
  }
  if (!isToken(node)) {
    throw new MissingTokenError(path);
  }
  const aliasPath = extractAliasPath(node.$value);
  if (aliasPath !== null) {
    visited.add(path);
    const resolved = _resolve(aliasPath, tree, visited);
    visited.delete(path);
    return resolved;
  }
  return node.$value;
}
/**
 * resolveAllTokens.
 * @param {DTCGGroup} tokenTree
 * @returns {Record<string, DTCGToken["$value"]>}
 */
export function resolveAllTokens(tokenTree) {
  const result = {};
  collectTokens(tokenTree, [], result);
  const resolved = {};
  for (const path of Object.keys(result)) {
    try {
      resolved[path] = resolveToken(path, tokenTree);
    } catch {
      resolved[path] = result[path];
    }
  }
  return resolved;
}
function collectTokens(node, segments, acc) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$"))
      continue;
    if (value === null || typeof value !== "object")
      continue;
    const childSegments = [...segments, key];
    const child = value;
    if (isToken(child)) {
      acc[childSegments.join(".")] = child.$value;
    } else {
      collectTokens(child, childSegments, acc);
    }
  }
}
