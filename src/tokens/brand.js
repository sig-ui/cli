// @ts-check

/**
 * SigUI CLI tokens module for brand.
 * @module
 */
function isToken(node) {
  return node !== null && typeof node === "object" && "$value" in node;
}
function deepClone(value) {
  if (value === null || typeof value !== "object")
    return value;
  if (Array.isArray(value))
    return value.map(deepClone);
  const result = {};
  for (const [k, v] of Object.entries(value)) {
    result[k] = deepClone(v);
  }
  return result;
}
function deepMerge(target, source) {
  for (const [key, srcValue] of Object.entries(source)) {
    if (srcValue !== null && typeof srcValue === "object" && !Array.isArray(srcValue) && !isToken(srcValue)) {
      const existing = target[key];
      if (existing !== null && typeof existing === "object" && !Array.isArray(existing)) {
        deepMerge(existing, srcValue);
      } else {
        target[key] = deepClone(srcValue);
      }
    } else {
      target[key] = deepClone(srcValue);
    }
  }
}
function applyFlatOverrides(tree, overrides) {
  for (const [path, value] of Object.entries(overrides)) {
    const parts = path.split(".");
    let current = tree;
    for (let i = 0;i < parts.length - 1; i++) {
      const part = parts[i];
      const existing = current[part];
      if (existing === null || typeof existing !== "object" || Array.isArray(existing)) {
        current[part] = {};
      }
      current = current[part];
    }
    const lastKey = parts[parts.length - 1];
    const existing = current[lastKey];
    if (isToken(existing)) {
      existing["$value"] = value;
    } else {
      current[lastKey] = { $value: value };
    }
  }
}
/**
 * mergeBrandOverrides.
 * @param {DTCGGroup} baseTokens
 * @param {DTCGGroup} brandOverrides
 * @returns {DTCGGroup}
 */
export function mergeBrandOverrides(baseTokens, brandOverrides) {
  const result = deepClone(baseTokens);
  deepMerge(result, brandOverrides);
  return result;
}
/**
 * createBrandTheme.
 * @param {DTCGGroup} baseDTCG
 * @param {BrandConfig} brandConfig
 * @returns {DTCGGroup}
 */
export function createBrandTheme(baseDTCG, brandConfig) {
  const result = deepClone(baseDTCG);
  if (brandConfig.semanticOverrides) {
    applyFlatOverrides(result, brandConfig.semanticOverrides);
  }
  if (brandConfig.componentOverrides) {
    applyFlatOverrides(result, brandConfig.componentOverrides);
  }
  if (brandConfig.modes && Object.keys(brandConfig.modes).length > 0) {
    result["_brandModes"] = brandConfig.modes;
  }
  result["_brand"] = {
    name: brandConfig.name,
    displayName: brandConfig.displayName ?? brandConfig.name
  };
  return result;
}
/**
 * resolveBrandChain.
 * @param {string} brandName
 * @param {Record<string, BrandConfig>} allBrands
 * @returns {BrandConfig}
 */
export function resolveBrandChain(brandName, allBrands) {
  const chain = [];
  const visited = new Set;
  let current = brandName;
  while (current != null) {
    if (visited.has(current)) {
      throw new Error(`Circular brand inheritance detected: ${[...visited, current].join(" → ")}`);
    }
    const config = allBrands[current];
    if (!config) {
      throw new Error(`Brand "${current}" not found in brand registry (referenced by extends chain)`);
    }
    visited.add(current);
    chain.push(config);
    current = config.extends === null ? undefined : config.extends;
  }
  chain.reverse();
  const merged = chain.reduce((acc, brand) => {
    return {
      name: brand.name,
      displayName: brand.displayName ?? acc.displayName,
      extends: brand.extends,
      primitives: brand.primitives ? {
        color: { ...acc.primitives?.color, ...brand.primitives.color },
        backgrounds: {
          ...acc.primitives?.backgrounds,
          ...brand.primitives.backgrounds
        }
      } : acc.primitives,
      semanticOverrides: {
        ...acc.semanticOverrides,
        ...brand.semanticOverrides
      },
      componentOverrides: {
        ...acc.componentOverrides,
        ...brand.componentOverrides
      },
      modes: mergeModes(acc.modes, brand.modes)
    };
  });
  return merged;
}
/**
 * createAllBrandThemes.
 * @param {DTCGGroup} baseDTCG
 * @param {Record<string, BrandConfig>} brands
 * @returns {Record<string, DTCGGroup>}
 */
export function createAllBrandThemes(baseDTCG, brands) {
  const result = {};
  for (const brandName of Object.keys(brands)) {
    const resolved = resolveBrandChain(brandName, brands);
    result[brandName] = createBrandTheme(baseDTCG, resolved);
  }
  return result;
}
function mergeModes(parent, child) {
  if (!parent && !child)
    return;
  if (!parent)
    return child;
  if (!child)
    return parent;
  const allKeys = new Set([...Object.keys(parent), ...Object.keys(child)]);
  const merged = {};
  for (const key of allKeys) {
    merged[key] = { ...parent[key], ...child[key] };
  }
  return merged;
}
