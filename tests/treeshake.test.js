// @ts-check

/**
 * Repository module for treeshake.test.
 * @module
 */
import { test, expect, describe } from "bun:test";
import {
  treeShakeCSS,
  scanProjectForTokenUsage,
  buildComponentClassMap,
  resolveUsedClasses,
  treeShakeComponentCSS,
  scanProjectForComponentUsage
} from "../src/generators/treeshake.js";
import { generateTokenCSS } from "../src/generators/css.js";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
describe("treeShakeCSS", () => {
  const sampleCSS = `@layer sigui.tokens {

:root {
  /* Brand palette */
  --brand-50: #eef2ff;
  --brand-100: #e0e7ff;
  --brand-500: #6366f1;
  --brand-900: #312e81;

  /* Semantic colors */
  --sg-color-primary: var(--brand-500);
  --sg-color-primary-hover: var(--brand-600);
  --sg-color-text: var(--neutral-800);

  /* Spacing */
  --sg-base-unit: 0.25rem;
  --sg-space-1: calc(1 * var(--sg-base-unit));
  --sg-space-2: calc(2 * var(--sg-base-unit));
  --sg-space-4: calc(4 * var(--sg-base-unit));

  /* Component tokens */
  --sg-button-bg: var(--sg-color-primary);
  --sg-card-bg: var(--sg-surface-container);
}

} /* @layer sigui.tokens */
`;
  test("keeps used properties and removes unused ones", () => {
    const refs = new Set(["--sg-space-4"]);
    const result = treeShakeCSS(sampleCSS, refs);
    expect(result.css).toContain("--sg-space-4: calc(4 * var(--sg-base-unit));");
    expect(result.css).toContain("--sg-base-unit:");
    expect(result.css).not.toContain("--sg-space-1:");
    expect(result.css).not.toContain("--sg-space-2:");
    expect(result.css).not.toContain("--brand-50:");
    expect(result.stats.removed).toBeGreaterThan(0);
    expect(result.stats.kept).toBe(2);
  });
  test("resolves transitive dependencies", () => {
    const refs = new Set(["--sg-color-primary"]);
    const result = treeShakeCSS(sampleCSS, refs);
    expect(result.css).toContain("--sg-color-primary: var(--brand-500);");
    expect(result.css).toContain("--brand-500: #6366f1;");
    expect(result.css).not.toContain("--brand-50:");
    expect(result.css).not.toContain("--brand-100:");
    expect(result.css).not.toContain("--brand-900:");
  });
  test("resolves deep transitive chains", () => {
    const refs = new Set(["--sg-button-bg"]);
    const result = treeShakeCSS(sampleCSS, refs);
    expect(result.css).toContain("--sg-button-bg:");
    expect(result.css).toContain("--sg-color-primary:");
    expect(result.css).toContain("--brand-500:");
    expect(result.stats.kept).toBe(3);
  });
  test("preserves non-declaration lines (selectors, @rules, comments)", () => {
    const refs = new Set(["--sg-space-4"]);
    const result = treeShakeCSS(sampleCSS, refs);
    expect(result.css).toContain("@layer sigui.tokens {");
    expect(result.css).toContain(":root {");
    expect(result.css).toContain("} /* @layer sigui.tokens */");
  });
  test("treats var() refs in non-declaration lines as roots", () => {
    const cssWithRules = `@layer sigui.tokens {
:root {
  --brand-500: #6366f1;
  --brand-900: #312e81;
  --sg-button-bg: var(--brand-500);
}
}

.sg-button { background: var(--sg-button-bg); }
`;
    const refs = new Set;
    const result = treeShakeCSS(cssWithRules, refs);
    expect(result.css).toContain("--sg-button-bg:");
    expect(result.css).toContain("--brand-500:");
    expect(result.css).not.toContain("--brand-900:");
  });
  test("keeps all declarations of a used property across contexts", () => {
    const cssWithDarkMode = `@layer sigui.tokens {
:root {
  --brand-400: #818cf8;
  --brand-500: #6366f1;
  --sg-color-primary: var(--brand-500);

  &[data-theme="dark"] {
    --sg-color-primary: var(--brand-400);
  }
}
}`;
    const refs = new Set(["--sg-color-primary"]);
    const result = treeShakeCSS(cssWithDarkMode, refs);
    const matches = result.css.match(/--sg-color-primary:/g);
    expect(matches).toHaveLength(2);
    expect(result.css).toContain("--brand-400:");
    expect(result.css).toContain("--brand-500:");
  });
  test("returns correct stats", () => {
    const refs = new Set(["--sg-space-4"]);
    const result = treeShakeCSS(sampleCSS, refs);
    expect(result.stats.total).toBe(13);
    expect(result.stats.kept).toBe(2);
    expect(result.stats.removed).toBe(11);
    expect(result.stats.total).toBe(result.stats.kept + result.stats.removed);
  });
  test("no-op when all properties are used", () => {
    const allRefs = new Set([
      "--brand-50",
      "--brand-100",
      "--brand-500",
      "--brand-900",
      "--sg-color-primary",
      "--sg-color-primary-hover",
      "--sg-color-text",
      "--sg-base-unit",
      "--sg-space-1",
      "--sg-space-2",
      "--sg-space-4",
      "--sg-button-bg",
      "--sg-card-bg"
    ]);
    const result = treeShakeCSS(sampleCSS, allRefs);
    expect(result.stats.removed).toBe(0);
    expect(result.stats.kept).toBe(result.stats.total);
  });
  test("ignores external refs not declared in the CSS", () => {
    const refs = new Set(["--nonexistent-prop", "--sg-space-4"]);
    const result = treeShakeCSS(sampleCSS, refs);
    expect(result.stats.kept).toBe(2);
    expect(result.css).toContain("--sg-space-4:");
  });
  test("collapses excessive blank lines", () => {
    const css = `:root {
  --a: 1;

  --b: 2;

  --c: 3;

  --d: 4;
}`;
    const refs = new Set(["--a", "--d"]);
    const result = treeShakeCSS(css, refs);
    expect(result.css).not.toMatch(/\n{3,}/);
    expect(result.css).toContain("--a: 1;");
    expect(result.css).toContain("--d: 4;");
  });
});
describe("scanProjectForTokenUsage", () => {
  test("finds var() references in source files", async () => {
    const tmpDir = path.join(os.tmpdir(), `sigui-test-scan-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    try {
      await Bun.write(path.join(tmpDir, "app.js"), `<div style="color: var(--sg-color-primary)">
  <span class="text" style="font-size: var(--sg-text-lg)">Hello</span>
</div>`);
      await Bun.write(path.join(tmpDir, "styles.css"), `.card { background: var(--sg-card-bg); border: 1px solid var(--sg-color-border); }`);
      const refs = await scanProjectForTokenUsage(tmpDir);
      expect(refs.has("--sg-color-primary")).toBe(true);
      expect(refs.has("--sg-text-lg")).toBe(true);
      expect(refs.has("--sg-card-bg")).toBe(true);
      expect(refs.has("--sg-color-border")).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
  test("finds string-literal property references in JS/TS files", async () => {
    const tmpDir = path.join(os.tmpdir(), `sigui-test-scan-js-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    try {
      await Bun.write(path.join(tmpDir, "theme.js"), `el.style.setProperty('--sg-density', '0.75');
const v = getComputedStyle(el).getPropertyValue("--sg-color-primary");`);
      const refs = await scanProjectForTokenUsage(tmpDir);
      expect(refs.has("--sg-density")).toBe(true);
      expect(refs.has("--sg-color-primary")).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
  test("excludes node_modules", async () => {
    const tmpDir = path.join(os.tmpdir(), `sigui-test-scan-excl-${Date.now()}`);
    const nmDir = path.join(tmpDir, "node_modules", "some-pkg");
    fs.mkdirSync(nmDir, { recursive: true });
    try {
      await Bun.write(path.join(tmpDir, "app.js"), `const x = "var(--sg-real)";`);
      await Bun.write(path.join(nmDir, "index.js"), `const x = "var(--sg-from-nm)";`);
      const refs = await scanProjectForTokenUsage(tmpDir);
      expect(refs.has("--sg-real")).toBe(true);
      expect(refs.has("--sg-from-nm")).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
  test("excludes custom directories", async () => {
    const tmpDir = path.join(os.tmpdir(), `sigui-test-scan-custom-${Date.now()}`);
    const outDir = path.join(tmpDir, "src", "sigui");
    fs.mkdirSync(outDir, { recursive: true });
    try {
      await Bun.write(path.join(tmpDir, "app.css"), `.x { color: var(--sg-kept); }`);
      await Bun.write(path.join(outDir, "tokens.css"), `:root { --sg-from-output: #fff; }`);
      const refs = await scanProjectForTokenUsage(tmpDir, {
        exclude: ["node_modules", "src/sigui"]
      });
      expect(refs.has("--sg-kept")).toBe(true);
      expect(refs.has("--sg-from-output")).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
describe("treeShakeCSS with generateTokenCSS", () => {
  test("tree-shaking real token CSS preserves structure", () => {
    const config = { brand: "#6366f1" };
    const css = generateTokenCSS(config);
    const refs = new Set(["--sg-color-primary", "--sg-space-4", "--sg-font-family"]);
    const result = treeShakeCSS(css, refs);
    expect(result.css).toContain("@layer sigui.tokens {");
    expect(result.css).toContain(":root {");
    expect(result.css).toContain("} /* @layer sigui.tokens */");
    expect(result.css).toContain("--sg-color-primary:");
    expect(result.css).toContain("--brand-700:");
    expect(result.css).toContain("--sg-space-4:");
    expect(result.css).toContain("--sg-font-family:");
    expect(result.stats.removed).toBeGreaterThan(50);
  });
  test("tree-shaking removes unused palette shades", () => {
    const config = { brand: "#6366f1" };
    const css = generateTokenCSS(config);
    const refs = new Set(["--sg-color-primary"]);
    const result = treeShakeCSS(css, refs);
    expect(result.css).toContain("--brand-700:");
    expect(result.css).not.toContain("--brand-50:");
    expect(result.css).not.toContain("--brand-100:");
    expect(result.css).not.toContain("--brand-200:");
  });
});
describe("buildComponentClassMap", () => {
  const sampleBaseCSS = `@layer sigui.base {

  /* Stack */
  .sg-stack {
    display: flex;
    flex-direction: column;
  }

  .sg-stack[data-direction="horizontal"] {
    flex-direction: row;
  }

  /* Button */
  .sg-button {
    display: inline-flex;
    align-items: center;
  }

  /* Card */
  .sg-card {
    background: var(--sg-card-bg);
  }

  .sg-card-header {
    padding: 1rem;
  }

  .sg-card-body {
    padding: 1rem;
  }

  .sg-card-footer {
    padding: 1rem;
  }

  /* ----------- Layout Primitives ----------- */

  /* Grid */
  .sg-grid {
    display: grid;
  }

  /* AlertDialog */
  .sg-alert-dialog {
    background: white;
  }

  .sg-alert-dialog::backdrop {
    background: rgba(0,0,0,0.5);
  }

} /* @layer sigui.base */`;
  test("parses comment-delimited sections into class sets", () => {
    const map = buildComponentClassMap(sampleBaseCSS);
    expect(map.has("Stack")).toBe(true);
    expect(map.get("Stack").has(".sg-stack")).toBe(true);
    expect(map.has("Button")).toBe(true);
    expect(map.get("Button").has(".sg-button")).toBe(true);
    expect(map.has("Card")).toBe(true);
    const cardClasses = map.get("Card");
    expect(cardClasses.has(".sg-card")).toBe(true);
    expect(cardClasses.has(".sg-card-header")).toBe(true);
    expect(cardClasses.has(".sg-card-body")).toBe(true);
    expect(cardClasses.has(".sg-card-footer")).toBe(true);
  });
  test("handles compound component names like AlertDialog", () => {
    const map = buildComponentClassMap(sampleBaseCSS);
    expect(map.has("AlertDialog")).toBe(true);
    expect(map.get("AlertDialog").has(".sg-alert-dialog")).toBe(true);
  });
  test("skips section dividers that have no classes", () => {
    const map = buildComponentClassMap(sampleBaseCSS);
    expect(map.has("Grid")).toBe(true);
  });
  test("works with real component CSS", () => {
    const componentsDir = path.resolve(import.meta.dir, "../../components/src/components");
    const tierDirs = ["native", "primitives", "recipes"];
    let syntheticCSS = `@layer sigui.base {
`;
    for (const tier of tierDirs) {
      const tierPath = path.join(componentsDir, tier);
      const componentDirs = fs.readdirSync(tierPath).filter((d) => fs.statSync(path.join(tierPath, d)).isDirectory());
      for (const dir of componentDirs) {
        const cssFiles = fs.readdirSync(path.join(tierPath, dir)).filter((f) => f.endsWith(".css"));
        if (cssFiles.length === 0)
          continue;
        const content = fs.readFileSync(path.join(tierPath, dir, cssFiles[0]), "utf-8");
        const baseMatch = content.match(/@layer sigui\.base \{([\s\S]*?)\n\}/);
        if (baseMatch) {
          syntheticCSS += `
  /* ${dir} */
${baseMatch[1]}
`;
        }
      }
    }
    syntheticCSS += `
} /* @layer sigui.base */
`;
    const map = buildComponentClassMap(syntheticCSS);
    expect(map.size).toBeGreaterThan(20);
    expect(map.has("Button")).toBe(true);
    expect(map.get("Button").has(".sg-button")).toBe(true);
    expect(map.has("Card")).toBe(true);
    expect(map.get("Card").has(".sg-card")).toBe(true);
    expect(map.get("Card").has(".sg-card-header")).toBe(true);
    expect(map.has("Dialog")).toBe(true);
    expect(map.get("Dialog").has(".sg-dialog")).toBe(true);
    expect(map.has("AlertDialog")).toBe(true);
    expect(map.get("AlertDialog").has(".sg-alert-dialog")).toBe(true);
  });
});
describe("resolveUsedClasses", () => {
  const classMap = new Map([
    ["Button", new Set([".sg-button"])],
    ["Card", new Set([".sg-card", ".sg-card-header", ".sg-card-body", ".sg-card-footer"])],
    ["AlertDialog", new Set([".sg-alert-dialog"])],
    ["Input", new Set([".sg-input", ".sg-input-wrapper", ".sg-input-label"])]
  ]);
  test("resolves exact component names", () => {
    const components = new Set(["Button", "Card"]);
    const result = resolveUsedClasses(components, new Set, classMap);
    expect(result.has(".sg-button")).toBe(true);
    expect(result.has(".sg-card")).toBe(true);
    expect(result.has(".sg-card-header")).toBe(true);
    expect(result.has(".sg-card-body")).toBe(true);
    expect(result.has(".sg-card-footer")).toBe(true);
    expect(result.has(".sg-alert-dialog")).toBe(false);
  });
  test("resolves sub-component prefix matching", () => {
    const components = new Set(["CardHeader"]);
    const result = resolveUsedClasses(components, new Set, classMap);
    expect(result.has(".sg-card")).toBe(true);
    expect(result.has(".sg-card-header")).toBe(true);
  });
  test("resolves AlertDialogContent → AlertDialog", () => {
    const components = new Set(["AlertDialogContent"]);
    const result = resolveUsedClasses(components, new Set, classMap);
    expect(result.has(".sg-alert-dialog")).toBe(true);
    expect(result.has(".sg-button")).toBe(false);
  });
  test("includes directly referenced classes", () => {
    const directClasses = new Set([".sg-input"]);
    const result = resolveUsedClasses(new Set, directClasses, classMap);
    expect(result.has(".sg-input")).toBe(true);
    expect(result.has(".sg-input-wrapper")).toBe(false);
  });
  test("combines component and direct class usage", () => {
    const components = new Set(["Button"]);
    const directClasses = new Set([".sg-card"]);
    const result = resolveUsedClasses(components, directClasses, classMap);
    expect(result.has(".sg-button")).toBe(true);
    expect(result.has(".sg-card")).toBe(true);
  });
  test("handles unknown components gracefully", () => {
    const components = new Set(["NonExistent"]);
    const result = resolveUsedClasses(components, new Set, classMap);
    expect(result.size).toBe(0);
  });
});
describe("treeShakeComponentCSS", () => {
  const sampleComponentCSS = `@layer sigui.base {

  .sg-button {
    display: inline-flex;
    background: var(--sg-button-bg);
  }

  .sg-card {
    background: var(--sg-card-bg);
  }

  .sg-card-header {
    padding: 1rem;
  }

  .sg-dialog {
    background: white;
  }

  .sg-dialog::backdrop {
    background: rgba(0,0,0,0.5);
  }

}`;
  test("keeps rules for used classes and removes unused ones", () => {
    const used = new Set([".sg-button"]);
    const result = treeShakeComponentCSS(sampleComponentCSS, used);
    expect(result.css).toContain(".sg-button");
    expect(result.css).not.toContain(".sg-card");
    expect(result.css).not.toContain(".sg-card-header");
    expect(result.css).not.toContain(".sg-dialog");
    expect(result.stats.removed).toBeGreaterThan(0);
  });
  test("keeps multiple used component rules", () => {
    const used = new Set([".sg-button", ".sg-card", ".sg-card-header"]);
    const result = treeShakeComponentCSS(sampleComponentCSS, used);
    expect(result.css).toContain(".sg-button");
    expect(result.css).toContain(".sg-card");
    expect(result.css).toContain(".sg-card-header");
    expect(result.css).not.toContain(".sg-dialog");
  });
  test("preserves @keyframes", () => {
    const css = `@layer sigui.states {
  @keyframes sigui-spin {
    to { transform: rotate(360deg); }
  }

  .sg-button::before {
    opacity: 0;
  }

  .sg-dialog { background: white; }
}`;
    const used = new Set([".sg-button"]);
    const result = treeShakeComponentCSS(css, used);
    expect(result.css).toContain("@keyframes sigui-spin");
    expect(result.css).toContain(".sg-button");
    expect(result.css).not.toContain(".sg-dialog");
  });
  test("preserves @media blocks that contain used rules", () => {
    const css = `@media (forced-colors: active) {
  .sg-button { border: 1px solid ButtonText; }
  .sg-dialog { border: 1px solid ButtonText; }
}`;
    const used = new Set([".sg-button"]);
    const result = treeShakeComponentCSS(css, used);
    expect(result.css).toContain("@media (forced-colors: active)");
    expect(result.css).toContain(".sg-button");
    expect(result.css).not.toContain(".sg-dialog");
  });
  test("removes @media blocks that become empty after filtering", () => {
    const css = `@media (forced-colors: active) {
  .sg-dialog { border: 1px solid ButtonText; }
}

.sg-button { display: flex; }`;
    const used = new Set([".sg-button"]);
    const result = treeShakeComponentCSS(css, used);
    expect(result.css).not.toContain("@media (forced-colors: active)");
    expect(result.css).toContain(".sg-button");
  });
  test("keeps rules without .sg-* classes (global rules)", () => {
    const css = `@layer sigui.states {
  [data-disabled] {
    opacity: 0.38;
    pointer-events: none;
  }

  .sg-button:hover { background: blue; }
  .sg-dialog { background: white; }
}`;
    const used = new Set([".sg-button"]);
    const result = treeShakeComponentCSS(css, used);
    expect(result.css).toContain("[data-disabled]");
    expect(result.css).toContain(".sg-button:hover");
    expect(result.css).not.toContain(".sg-dialog");
  });
  test("handles comma-separated selectors - keeps if any class matches", () => {
    const css = `.sg-button[data-color="primary"],
.sg-card[data-color="primary"] {
  background: blue;
}`;
    const used = new Set([".sg-button"]);
    const result = treeShakeComponentCSS(css, used);
    expect(result.css).toContain(".sg-button");
  });
  test("collapses excessive blank lines", () => {
    const css = `.sg-button { color: red; }



.sg-card { color: blue; }



.sg-dialog { color: green; }`;
    const used = new Set([".sg-button", ".sg-dialog"]);
    const result = treeShakeComponentCSS(css, used);
    expect(result.css).not.toMatch(/\n{3,}/);
    expect(result.css).toContain(".sg-button");
    expect(result.css).toContain(".sg-dialog");
    expect(result.css).not.toContain(".sg-card");
  });
  test("returns correct stats", () => {
    const used = new Set([".sg-button"]);
    const result = treeShakeComponentCSS(sampleComponentCSS, used);
    expect(result.stats.total).toBeGreaterThan(0);
    expect(result.stats.kept).toBeGreaterThan(0);
    expect(result.stats.removed).toBeGreaterThan(0);
    expect(result.stats.total).toBe(result.stats.kept + result.stats.removed);
  });
  test("no-op when all classes are used", () => {
    const allClasses = new Set([".sg-button", ".sg-card", ".sg-card-header", ".sg-dialog"]);
    const result = treeShakeComponentCSS(sampleComponentCSS, allClasses);
    expect(result.stats.removed).toBe(0);
    expect(result.css).toContain(".sg-button");
    expect(result.css).toContain(".sg-card");
    expect(result.css).toContain(".sg-dialog");
  });
});
describe("scanProjectForComponentUsage", () => {
  test("detects import statements and JSX tags", async () => {
    const tmpDir = path.join(os.tmpdir(), `sigui-test-comp-scan-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    try {
      await Bun.write(path.join(tmpDir, "app.jsx"), `import { Button } from "$lib/sigui/components/Button";
import { Card } from "./sigui/components/Card.js";
export function App() {
  return (
    <>
      <Button>Click</Button>
      <Card>Content</Card>
      <AlertDialog>Confirm</AlertDialog>
    </>
  );
}`);
      const usage = await scanProjectForComponentUsage(tmpDir);
      expect(usage.components.has("Button")).toBe(true);
      expect(usage.components.has("Card")).toBe(true);
      expect(usage.components.has("AlertDialog")).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
  test("detects direct .sg-* class usage", async () => {
    const tmpDir = path.join(os.tmpdir(), `sigui-test-comp-direct-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    try {
      await Bun.write(path.join(tmpDir, "styles.css"), `.sg-button { color: red; }
.custom-wrapper .sg-card { margin: 0; }`);
      const usage = await scanProjectForComponentUsage(tmpDir);
      expect(usage.directClasses.has(".sg-button")).toBe(true);
      expect(usage.directClasses.has(".sg-card")).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
describe("treeShakeComponentCSS integration", () => {
  test("tree-shakes real component CSS with subset of components", () => {
    const componentsDir = path.resolve(import.meta.dir, "../../components/src/components");
    const tierDirs = ["native", "primitives", "recipes"];
    let syntheticCSS = `@layer sigui.base {
`;
    for (const tier of tierDirs) {
      const tierPath = path.join(componentsDir, tier);
      const componentDirs = fs.readdirSync(tierPath).filter((d) => fs.statSync(path.join(tierPath, d)).isDirectory());
      for (const dir of componentDirs) {
        const cssFiles = fs.readdirSync(path.join(tierPath, dir)).filter((f) => f.endsWith(".css"));
        if (cssFiles.length === 0)
          continue;
        const content = fs.readFileSync(path.join(tierPath, dir, cssFiles[0]), "utf-8");
        const baseMatch = content.match(/@layer sigui\.base \{([\s\S]*?)\n\}/);
        if (baseMatch) {
          syntheticCSS += `
  /* ${dir} */
${baseMatch[1]}
`;
        }
      }
    }
    syntheticCSS += `
} /* @layer sigui.base */
`;
    const classMap = buildComponentClassMap(syntheticCSS);
    const components = new Set(["Button", "Card", "CardHeader", "CardBody", "CardFooter"]);
    const usedClasses = resolveUsedClasses(components, new Set, classMap);
    const result = treeShakeComponentCSS(syntheticCSS, usedClasses);
    expect(result.css).toContain(".sg-button");
    expect(result.css).toContain(".sg-card");
    expect(result.css).toContain(".sg-card-header");
    expect(result.css).not.toContain(".sg-dialog");
    expect(result.css).not.toContain(".sg-toast");
    expect(result.css).not.toContain(".sg-accordion");
    expect(result.stats.removed).toBeGreaterThan(10);
    expect(result.css.length).toBeLessThan(syntheticCSS.length);
  });
});
