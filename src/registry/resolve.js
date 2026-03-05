// @ts-check

/**
 * SigUI CLI registry module for resolve.
 * @module
 */
/**
 * resolveComponents.
 * @param {Registry} registry
 * @param {string[]} requested
 * @returns {ResolvedResult}
 */
export function resolveComponents(registry, requested) {
  const components = new Map;
  const libFiles = new Set;
  const npmDeps = new Set;
  const queue = [...requested];
  const visited = new Set;
  while (queue.length > 0) {
    const key = queue.pop();
    if (visited.has(key))
      continue;
    visited.add(key);
    const comp = registry.components[key];
    if (!comp) {
      throw new Error(`Component "${key}" not found in registry. Available: ${Object.keys(registry.components).sort().join(", ")}`);
    }
    components.set(key, comp);
    for (const lib of comp.libDeps) {
      libFiles.add(lib);
    }
    for (const dep of comp.npmDeps) {
      npmDeps.add(dep);
    }
    for (const depKey of comp.componentDeps) {
      if (!visited.has(depKey)) {
        queue.push(depKey);
      }
    }
  }
  for (const libFile of libFiles) {
    const libEntry = registry.lib[libFile];
    if (libEntry) {
      for (const dep of libEntry.npmDeps) {
        npmDeps.add(dep);
      }
    }
  }
  return { components, libFiles, npmDeps };
}
