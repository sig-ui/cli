// @ts-check

/**
 * SigUI CLI commands module for add.
 * @module
 */
import * as path from "node:path";
import * as log from "../utils/log.js";
import { fetchRegistry, fetchFile } from "../registry/fetch.js";
import { resolveComponents } from "../registry/resolve.js";
import { detectPackageManager, installCommand } from "../registry/detect-pm.js";
function toKebab(name) {
  return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
function parseArgs(args) {
  const components = [];
  let overwrite = false;
  let dryRun = false;
  let list = false;
  let local;
  let outputDir = "src/sigui/components";
  let registryUrl;
  for (const arg of args) {
    if (arg === "--overwrite") {
      overwrite = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--list") {
      list = true;
    } else if (arg.startsWith("--from=")) {
      const val = arg.slice("--from=".length);
      if (val === "local") {
        local = path.resolve(import.meta.dir, "../../../components/src/components");
      } else {
        local = path.resolve(val);
      }
    } else if (arg.startsWith("--dir=")) {
      outputDir = arg.slice("--dir=".length);
    } else if (arg.startsWith("--registry=")) {
      registryUrl = arg.slice("--registry=".length);
    } else if (!arg.startsWith("-")) {
      components.push(toKebab(arg));
    }
  }
  return { components, overwrite, dryRun, list, local, outputDir, registryUrl };
}
async function listComponents(registry) {
  const keys = Object.keys(registry.components).sort();
  console.log(`
Available components (${keys.length}):
`);
  for (const key of keys) {
    const comp = registry.components[key];
    const deps = comp.componentDeps.length > 0 ? `  (deps: ${comp.componentDeps.join(", ")})` : "";
    console.log(`  ${key}${deps}`);
  }
  console.log();
}
/**
 * add.
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export async function add(args) {
  const opts = parseArgs(args);
  const cwd = process.cwd();
  try {
    const configPath = await (async () => {
      const js = path.join(cwd, "sigui.config.js");
      if (await Bun.file(js).exists()) return js;
      const ts = path.join(cwd, "sigui.config.ts");
      if (await Bun.file(ts).exists()) return ts;
      return null;
    })();

    if (configPath) {
      const mod = await import(configPath);
      const config = mod.default ?? mod;
      if (config?.components?.dir) {
        opts.outputDir = config.components.dir;
      }
    }
  } catch {}
  log.info("Fetching component registry...");
  const registry = await fetchRegistry({
    registryUrl: opts.registryUrl,
    local: opts.local
  });
  if (opts.list) {
    await listComponents(registry);
    return;
  }
  if (opts.components.length === 0) {
    log.error("No components specified. Usage: sigui add <component> [component...]");
    log.info("Use --list to see available components.");
    process.exit(1);
  }
  const resolved = resolveComponents(registry, opts.components);
  const extraDeps = [...resolved.components.keys()].filter((k) => !opts.components.includes(k));
  if (opts.dryRun) {
    console.log(`
Dry run – the following would be installed:
`);
    console.log("Components:");
    for (const [key, comp] of resolved.components) {
      const marker = opts.components.includes(key) ? "" : " (auto-dep)";
      console.log(`  ${comp.dir}/${marker}`);
      for (const f of comp.files) {
        console.log(`    ${f}`);
      }
    }
    console.log(`
Lib files:`);
    for (const f of [...resolved.libFiles].sort()) {
      console.log(`  lib/${f}`);
    }
    console.log(`
Npm dependencies:`);
    for (const dep of [...resolved.npmDeps].sort()) {
      console.log(`  ${dep}`);
    }
    console.log(`
Output directory: ${opts.outputDir}`);
    return;
  }
  const requestedNames = opts.components.map((k) => resolved.components.get(k)?.name ?? k);
  log.info(`Adding: ${requestedNames.join(", ")}`);
  if (extraDeps.length > 0) {
    log.info(`Auto-resolving dependencies: ${extraDeps.map((k) => resolved.components.get(k)?.name ?? k).join(", ")}`);
  }
  const outDir = path.resolve(cwd, opts.outputDir);
  const libDir = path.join(outDir, "lib");
  let libInstalled = 0;
  for (const libFile of [...resolved.libFiles].sort()) {
    const destPath = path.join(libDir, libFile);
    const destFile = Bun.file(destPath);
    if (!opts.overwrite && await destFile.exists()) {
      continue;
    }
    const content = await fetchFile(registry, `lib/${libFile}`, {
      local: opts.local
    });
    await Bun.write(destPath, content);
    libInstalled++;
  }
  if (libInstalled > 0) {
    log.success(`Installed ${libInstalled} lib file${libInstalled !== 1 ? "s" : ""} → ${path.relative(cwd, libDir)}/`);
  }
  for (const [key, comp] of resolved.components) {
    const compDir = path.join(outDir, comp.dir);
    let installed = 0;
    let skipped = 0;
    for (const file of comp.files) {
      const destPath = path.join(compDir, file);
      const destFile = Bun.file(destPath);
      if (!opts.overwrite && await destFile.exists()) {
        skipped++;
        continue;
      }
      const content = await fetchFile(registry, `${comp.dir}/${file}`, {
        local: opts.local
      });
      await Bun.write(destPath, content);
      installed++;
    }
    if (installed > 0) {
      const marker = opts.components.includes(key) ? "" : " (dep)";
      log.success(`${comp.dir}/${marker} – ${installed} file${installed !== 1 ? "s" : ""}`);
    }
    if (skipped > 0) {
      log.dim(`  ${comp.dir}/: ${skipped} file${skipped !== 1 ? "s" : ""} already exist (use --overwrite to replace)`);
    }
  }
  if (resolved.npmDeps.size > 0) {
    const pm = await detectPackageManager(cwd);
    const deps = [...resolved.npmDeps].sort();
    const cmd = installCommand(pm, deps);
    console.log();
    log.info(`Install dependencies:

  ${cmd}
`);
  }
  log.success("Done!");
}
