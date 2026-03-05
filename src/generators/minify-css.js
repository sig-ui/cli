// @ts-check

/**
 * SigUI CLI generators module for minify css.
 * @module
 */
/**
 * minifyCSS.
 * @param {string} css
 * @returns {string}
 */
export function minifyCSS(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/ ?([{};]) ?/g, "$1").replace(/: /g, ":").replace(/, /g, ",").replace(/;}/g, "}").replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3(?![0-9a-fA-F])/g, "#$1$2$3").replace(/\b0(px|rem|em)\b/g, "0").trim();
}
