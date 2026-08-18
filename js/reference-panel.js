// Non-modal reference-panel component (SCHEMA.md §2.9, D-21). Shared shell mechanics
// for 5165's formula/notation panel now and 5485's periodic-table panel later (Phase
// 5.3) -- content-specific rendering stays with each phase's own consumer (the shapes
// are genuinely different: a labeled formula list here, a tabular grid there), so this
// module only owns what's actually identical between them: the finding-#17 non-modal
// in-document-flow pattern (open/close/Escape/focus-return), 5165's own section/entry
// rendering, and the first real format dispatch (text/mathml) this codebase has ever
// had -- every prior stem/option/explanation render call ignores `format` entirely and
// assumes "text" (D-21; question rendering retrofit deferred to issue #45).
//
// DOM-touching, like run.html's own UI code and unlike js/calculator.js's pure
// evaluator -- verified live in the browser (ROADMAP.md's established convention for
// this project), not via Node unit tests.

/**
 * Renders one content field (SCHEMA.md §2.6's `{format, value}` shape) into `el`.
 * `mathml` is parsed via a `<template>`'s `innerHTML` -- the browser's normal HTML
 * parser, which auto-namespaces `<math>` and its descendants as MathML per the
 * HTML5 foreign-content rules, exactly as if the markup had been authored inline in
 * the page. (An XML parse, e.g. `DOMParser(..., "application/xml")`, does NOT do
 * this without an explicit `xmlns` on every authored value -- content authored
 * without one silently renders as flat, unstyled text instead of real math, which
 * is real, not theoretical: it's what the first version of this function did, and
 * how the bug was actually caught live-testing this phase.) A value with no `<math>`
 * element in it at all (a typo, empty string) falls back to plain text rather than
 * silently rendering nothing. `code` is not yet exercised by any reference panel
 * content -- left unimplemented here rather than guessed at ahead of a real need.
 */
export function renderContent(el, content) {
  if (content.format === "mathml") {
    const template = document.createElement("template");
    template.innerHTML = content.value;
    const mathEl = template.content.querySelector("math");
    el.replaceChildren();
    if (mathEl) {
      el.appendChild(mathEl);
    } else {
      el.textContent = content.value;
    }
    return;
  }
  el.textContent = content.value;
}

/**
 * Renders a 5165-shaped reference panel (SCHEMA.md §2.9: sections of labeled
 * entries) into `containerEl`. Called once after the panel data loads -- the content
 * is static for the whole test, so there is nothing to re-render on every open/close
 * the way the calculator rebuilds its keypad per question.
 */
export function renderReferencePanel(containerEl, panel) {
  containerEl.replaceChildren();
  for (const section of panel.sections) {
    const sectionEl = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = section.heading;
    sectionEl.appendChild(heading);

    const list = document.createElement("dl");
    for (const entry of section.entries) {
      const dt = document.createElement("dt");
      dt.textContent = entry.label;
      const dd = document.createElement("dd");
      renderContent(dd, entry.content);
      list.append(dt, dd);
    }
    sectionEl.appendChild(list);
    containerEl.appendChild(sectionEl);
  }
}

/**
 * Wires the open/close/Escape/focus-return mechanics finding #17 requires, shared by
 * any non-modal reference panel. `panelEl` needs `tabindex="-1"` in markup so
 * `open()` can move focus into the panel itself (there's no natural first field the
 * way the calculator has its expression input) without also making it a normal tab
 * stop.
 */
export function createPanelShell({ panelEl, toggleEl, closeButtonEl }) {
  function isOpen() {
    return !panelEl.hidden;
  }
  function open() {
    panelEl.hidden = false;
    panelEl.focus();
  }
  function close() {
    panelEl.hidden = true;
    toggleEl.focus();
  }
  toggleEl.addEventListener("click", () => (isOpen() ? close() : open()));
  closeButtonEl.addEventListener("click", close);
  panelEl.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  return { open, close, isOpen };
}
