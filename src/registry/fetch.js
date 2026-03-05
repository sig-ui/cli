// @ts-check

/**
 * SigUI CLI registry module for fetch.
 * @module
 */
import * as path from "node:path";
/**
 * @typedef {{ componentDeps: string[], npmDeps: string[], files: string[], dir: string, name: string }} RegistryComponent
 * @typedef {{ meta: { raw: string }, components: Record<string, RegistryComponent> }} Registry
 */
const DEFAULT_REGISTRY_URL = "https://raw.githubusercontent.com/sig-ui/components/main/registry.json";
/**
 * fetchRegistry.
 * @param {{ registryUrl?: string, local?: string }} options
 * @returns {Promise<Registry>}
 */
export async function fetchRegistry(options) {
  if (options.local) {
    return fetchLocal(options.local);
  }
  return fetchRemote(options.registryUrl ?? DEFAULT_REGISTRY_URL);
}
async function fetchLocal(basePath) {
  const registryPath = path.join(basePath, "registry.json");
  const file = Bun.file(registryPath);
  if (!await file.exists()) {
    throw new Error(`Registry not found at ${registryPath}`);
  }
  return file.json();
}
async function fetchRemote(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch registry: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
/**
 * fetchFile.
 * @param {Registry} registry
 * @param {string} filePath
 * @param {{ local?: string }} options
 * @returns {Promise<string>}
 */
export async function fetchFile(registry, filePath, options) {
  if (options.local) {
    const absPath = path.join(options.local, filePath);
    const file = Bun.file(absPath);
    if (!await file.exists()) {
      throw new Error(`File not found: ${absPath}`);
    }
    return file.text();
  }
  const url = `${registry.meta.raw}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.text();
}
