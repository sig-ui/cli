// @ts-check

/**
 * SigUI CLI generators module for treeshake.
 * @module
 */
import { Glob } from "bun";
import * as path from "node:path";
const VAR_REF_RE = /var\(\s*(--[\w-]+)/g;
const STRING_PROP_RE = /['"](--[\w-]+)['"]/g;
const DECLARATION_RE = /^\s*(--[\w-]+)\s*:/;
const SOURCE_EXTENSIONS = [
  "vue",
  "tsx",
  "jsx",
  "ts",
  "js",
  "css",
  "scss",
  "less",
  "html",
  "astro"
];
const DEFAULT_EXCLUDE = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt"
];
/**
 * @typedef {{ css: string, stats: { total: number, kept: number, removed: number } }} TreeShakeResult
 */
function extractReferences(source) {
  const refs = [];
  for (const re of [VAR_REF_RE, STRING_PROP_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) {
      refs.push(m[1]);
    }
  }
  return refs;
}
/**
 * scanProjectForTokenUsage.
 * @param {string} cwd
 * @param {{ exclude?: string[] }} options
 * @returns {Promise<Set<string>>}
 */
export async function scanProjectForTokenUsage(cwd, options) {
  const exclude = options?.exclude ?? DEFAULT_EXCLUDE;
  const refs = new Set;
  const glob = new Glob(`**/*.{${SOURCE_EXTENSIONS.join(",")}}`);
  for await (const relPath of glob.scan({ cwd })) {
    if (exclude.some((dir) => relPath.startsWith(dir + "/")))
      continue;
    const content = await Bun.file(path.join(cwd, relPath)).text();
    for (const ref of extractReferences(content)) {
      refs.add(ref);
    }
  }
  return refs;
}
/**
 * treeShakeCSS.
 * @param {string} css
 * @param {Set<string>} externalRefs
 * @returns {TreeShakeResult}
 */
export function treeShakeCSS(css, externalRefs) {
  const lines = css.split(`
`);
  const declaredProps = new Set;
  const deps = new Map;
  const inlineRoots = new Set;
  for (const line of lines) {
    const declMatch = line.match(DECLARATION_RE);
    if (declMatch) {
      const propName = declMatch[1];
      declaredProps.add(propName);
      const colonIdx = line.indexOf(":", line.indexOf(propName) + propName.length);
      const value = line.slice(colonIdx + 1);
      VAR_REF_RE.lastIndex = 0;
      let m;
      const existing = deps.get(propName) ?? new Set;
      while ((m = VAR_REF_RE.exec(value)) !== null) {
        existing.add(m[1]);
      }
      deps.set(propName, existing);
    } else {
      VAR_REF_RE.lastIndex = 0;
      let m;
      while ((m = VAR_REF_RE.exec(line)) !== null) {
        inlineRoots.add(m[1]);
      }
    }
  }
  const roots = new Set;
  for (const r of externalRefs) {
    if (declaredProps.has(r))
      roots.add(r);
  }
  for (const r of inlineRoots) {
    if (declaredProps.has(r))
      roots.add(r);
  }
  const used = new Set;
  const queue = [...roots];
  while (queue.length > 0) {
    const prop = queue.pop();
    if (used.has(prop))
      continue;
    if (!declaredProps.has(prop))
      continue;
    used.add(prop);
    const propDeps = deps.get(prop);
    if (propDeps) {
      for (const dep of propDeps) {
        if (!used.has(dep))
          queue.push(dep);
      }
    }
  }
  const kept = [];
  for (const line of lines) {
    const declMatch = line.match(DECLARATION_RE);
    if (declMatch) {
      if (used.has(declMatch[1])) {
        kept.push(line);
      }
    } else {
      kept.push(line);
    }
  }
  let result = kept.join(`
`);
  result = result.replace(/\n{3,}/g, `

`);
  return {
    css: result,
    stats: {
      total: declaredProps.size,
      kept: used.size,
      removed: declaredProps.size - used.size
    }
  };
}
const SIGUI_CLASS_RE = /\.sg-[\w-]+/g;
const COMPONENT_COMMENT_RE = /^\s*\/\*\s+(\w[\w ]*\w|\w+)\s+\*\/\s*$/;
/**
 * buildComponentClassMap.
 * @param {string} baseCSS
 * @returns {Map<string, Set<string>>}
 */
export function buildComponentClassMap(baseCSS) {
  const map = new Map;
  let currentComponent = null;
  for (const line of baseCSS.split(`
`)) {
    const commentMatch = line.match(COMPONENT_COMMENT_RE);
    if (commentMatch) {
      const name = commentMatch[1].trim();
      currentComponent = name;
      if (!map.has(currentComponent)) {
        map.set(currentComponent, new Set);
      }
      continue;
    }
    if (currentComponent) {
      SIGUI_CLASS_RE.lastIndex = 0;
      let m;
      while ((m = SIGUI_CLASS_RE.exec(line)) !== null) {
        map.get(currentComponent).add(m[0]);
      }
    }
  }
  for (const [name, classes] of map) {
    if (classes.size === 0) {
      map.delete(name);
    }
  }
  return map;
}
const IMPORT_RE = /import\s+\{([^}]+)\}\s+from\s+['"](?:@sig-ui\/components(?:\/[\w-]+)*|\$(?:lib\/)?sigui\/components\/[\w/-]+|\.{1,2}\/[\w/-]*sigui\/components\/[\w/-]+)['"]/g;
const TAG_RE = /<([A-Z]\w+)/g;
/**
 * scanProjectForComponentUsage.
 * @param {string} cwd
 * @param {{ exclude?: string[] }} options
 * @returns {Promise<{ components: Set<string>, directClasses: Set<string> }>}
 */
export async function scanProjectForComponentUsage(cwd, options) {
  const exclude = options?.exclude ?? DEFAULT_EXCLUDE;
  const components = new Set;
  const directClasses = new Set;
  const glob = new Glob(`**/*.{${SOURCE_EXTENSIONS.join(",")}}`);
  for await (const relPath of glob.scan({ cwd })) {
    if (exclude.some((dir) => relPath.startsWith(dir + "/")))
      continue;
    const content = await Bun.file(path.join(cwd, relPath)).text();
    IMPORT_RE.lastIndex = 0;
    let m;
    while ((m = IMPORT_RE.exec(content)) !== null) {
      for (const name of m[1].split(",")) {
        const trimmed = name.trim().split(/\s+as\s+/)[0].trim();
        if (trimmed)
          components.add(trimmed);
      }
    }
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(content)) !== null) {
      components.add(m[1]);
    }
    SIGUI_CLASS_RE.lastIndex = 0;
    while ((m = SIGUI_CLASS_RE.exec(content)) !== null) {
      directClasses.add(m[0]);
    }
  }
  return { components, directClasses };
}
/**
 * resolveUsedClasses.
 * @param {Set<string>} components
 * @param {Set<string>} directClasses
 * @param {Map<string, Set<string>>} classMap
 * @returns {Set<string>}
 */
export function resolveUsedClasses(components, directClasses, classMap) {
  const usedClasses = new Set;
  for (const cls of directClasses) {
    usedClasses.add(cls);
  }
  const mapKeys = [...classMap.keys()].sort((a, b) => b.length - a.length);
  for (const compName of components) {
    if (classMap.has(compName)) {
      for (const cls of classMap.get(compName)) {
        usedClasses.add(cls);
      }
      continue;
    }
    for (const key of mapKeys) {
      if (compName.startsWith(key)) {
        for (const cls of classMap.get(key)) {
          usedClasses.add(cls);
        }
        break;
      }
    }
  }
  return usedClasses;
}
/**
 * treeShakeComponentCSS.
 * @param {string} css
 * @param {Set<string>} usedClasses
 * @returns {TreeShakeResult}
 */
export function treeShakeComponentCSS(css, usedClasses) {
  const stats = { total: 0, kept: 0 };
  const result = filterBlock(css, usedClasses, stats);
  const cleaned = result.replace(/\n{3,}/g, `

`);
  return {
    css: cleaned,
    stats: {
      total: stats.total,
      kept: stats.kept,
      removed: stats.total - stats.kept
    }
  };
}
function filterBlock(css, usedClasses, stats) {
  const output = [];
  let i = 0;
  while (i < css.length) {
    if (css[i] === `
` || css[i] === " " || css[i] === "\t" || css[i] === "\r") {
      output.push(css[i]);
      i++;
      continue;
    }
    if (css[i] === "/" && css[i + 1] === "*") {
      const endIdx = css.indexOf("*/", i + 2);
      if (endIdx === -1) {
        output.push(css.slice(i));
        break;
      }
      output.push(css.slice(i, endIdx + 2));
      i = endIdx + 2;
      continue;
    }
    const braceIdx = css.indexOf("{", i);
    if (braceIdx === -1) {
      output.push(css.slice(i));
      break;
    }
    const selector = css.slice(i, braceIdx).trim();
    const blockEnd = findMatchingBrace(css, braceIdx);
    if (blockEnd === -1) {
      output.push(css.slice(i));
      break;
    }
    const fullBlock = css.slice(i, blockEnd + 1);
    const innerContent = css.slice(braceIdx + 1, blockEnd);
    if (selector.startsWith("@keyframes") || selector.startsWith("@-webkit-keyframes")) {
      output.push(fullBlock);
    } else if (selector.startsWith("@layer") || selector.startsWith("@media") || selector.startsWith("@supports") || selector.startsWith("@container")) {
      const filtered = filterBlock(innerContent, usedClasses, stats);
      if (filtered.trim()) {
        output.push(css.slice(i, braceIdx + 1) + filtered + "}");
      }
    } else {
      const hasSiguiClass = hasSiguiClassName(selector);
      if (hasSiguiClass) {
        stats.total++;
        if (shouldKeepRule(selector, usedClasses)) {
          stats.kept++;
          output.push(fullBlock);
        }
      } else {
        output.push(fullBlock);
      }
    }
    i = blockEnd + 1;
  }
  return output.join("");
}
function hasSiguiClassName(selector) {
  SIGUI_CLASS_RE.lastIndex = 0;
  return SIGUI_CLASS_RE.test(selector);
}
function findMatchingBrace(css, start) {
  let depth = 1;
  let i = start + 1;
  while (i < css.length && depth > 0) {
    if (css[i] === "/" && css[i + 1] === "*") {
      i = css.indexOf("*/", i + 2);
      if (i === -1)
        return -1;
      i += 2;
      continue;
    }
    if (css[i] === "{")
      depth++;
    if (css[i] === "}")
      depth--;
    if (depth > 0)
      i++;
  }
  return depth === 0 ? i : -1;
}
function shouldKeepRule(selector, usedClasses) {
  SIGUI_CLASS_RE.lastIndex = 0;
  const classes = [];
  let m;
  while ((m = SIGUI_CLASS_RE.exec(selector)) !== null) {
    classes.push(m[0]);
  }
  if (classes.length === 0)
    return true;
  return classes.some((cls) => usedClasses.has(cls));
}
