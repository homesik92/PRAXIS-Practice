// Standard periodic-table element categories (SCHEMA.md §2.10) -- single source of
// truth for the category id/label pairs, shared between tools/verify.mjs's
// validation allow-list and run.html's display-label map (both already load ES
// modules natively, no build step needed -- D-3). css/base.css's own
// --color-cat-*/`.element-category-*` rules are necessarily a separate list: CSS
// has no mechanism to import from a JS module without build tooling, but they're
// static chemistry category names that essentially never change, unlike the
// id/label pairing this module unifies (code review finding, Phase 5.3).
export const ELEMENT_CATEGORIES = [
  { id: "alkali-metal", label: "Alkali metal" },
  { id: "alkaline-earth-metal", label: "Alkaline earth metal" },
  { id: "transition-metal", label: "Transition metal" },
  { id: "post-transition-metal", label: "Post-transition metal" },
  { id: "metalloid", label: "Metalloid" },
  { id: "nonmetal", label: "Nonmetal" },
  { id: "halogen", label: "Halogen" },
  { id: "noble-gas", label: "Noble gas" },
  { id: "lanthanide", label: "Lanthanide" },
  { id: "actinide", label: "Actinide" },
];
