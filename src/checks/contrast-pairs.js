// @ts-check

/**
 * SigUI CLI checks module for contrast pairs.
 * @module
 */
export const CONTRAST_PAIRS = [
  { fg: "text", bg: "surface", minLc: 60, context: "body text on default surface" },
  { fg: "text", bg: "surface-alt", minLc: 60, context: "body text on alternate surface" },
  { fg: "text-secondary", bg: "surface", minLc: 45, context: "secondary text on surface" },
  { fg: "text-muted", bg: "surface", minLc: 30, context: "muted/placeholder text" },
  { fg: "title", bg: "surface", minLc: 75, context: "heading on surface" },
  { fg: "subtitle", bg: "surface", minLc: 60, context: "subtitle on surface" },
  { fg: "link", bg: "surface", minLc: 45, context: "link text on surface" },
  { fg: "success", bg: "surface", minLc: 45, context: "success indicator on surface" },
  { fg: "warning", bg: "surface", minLc: 45, context: "warning indicator on surface" },
  { fg: "danger", bg: "surface", minLc: 45, context: "danger indicator on surface" },
  { fg: "info", bg: "surface", minLc: 45, context: "info indicator on surface" },
  { fg: "text-inverse", bg: "primary", minLc: 60, context: "text on primary button" },
  { fg: "text-inverse", bg: "danger", minLc: 60, context: "text on danger button" },
  { fg: "border", bg: "surface", minLc: 15, context: "border against surface" },
  { fg: "border-light", bg: "surface", minLc: 10, context: "subtle border against surface" }
];
