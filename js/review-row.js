// Shared DOM rendering for a js/results.js buildFullReview() row -- one bordered
// list item per question, showing every option with the chosen/correct answer
// marked in text (color is additive on top, never the only signal, matching this
// codebase's other review surfaces). Originally results.html-only (S4 "Full
// review"); extracted so run.html's Practice-a-topic/Category-test completion
// screen can show the identical review rather than reimplementing it (session
// owner feedback, Phase 6.9.4).
//
// DOM-touching, like js/reference-panel.js -- verified live in the browser, not
// via Node unit tests.

/**
 * Text markers, not color alone (SCHEMA.md S1.3) -- the label text itself is
 * still what carries the meaning to a screen reader; the color applied to it in
 * renderReviewRow below is a sighted-user addition on top of that, not a
 * replacement (same pattern as the review pass's flag icon).
 */
function optionSuffix(option) {
  if (!option.isChosen) return option.isCorrectOption ? " (correct answer)" : "";
  return option.isCorrectOption ? " (your answer — correct)" : " (your answer — incorrect)";
}

/**
 * Renders one {@link import("./results.js").buildFullReview} row as an `<li>`:
 * category, stem, every option (with the chosen/correct suffix), an unanswered
 * note if applicable, and the explanation.
 *
 * @param {ReturnType<typeof import("./results.js").buildFullReview>[number]} row
 * @returns {HTMLLIElement}
 */
export function renderReviewRow(row) {
  const li = document.createElement("li");

  const categoryEl = document.createElement("p");
  const categoryStrong = document.createElement("strong");
  categoryStrong.textContent = row.categoryLabel;
  categoryEl.appendChild(categoryStrong);
  li.appendChild(categoryEl);

  const stemEl = document.createElement("p");
  stemEl.textContent = row.stem;
  li.appendChild(stemEl);

  const optionsEl = document.createElement("ul");
  for (const option of row.options) {
    const optionLi = document.createElement("li");
    optionLi.appendChild(document.createTextNode(option.text));
    const suffix = optionSuffix(option);
    if (suffix) {
      const suffixEl = document.createElement("span");
      // isCorrectOption alone decides the color (not the suffix string) --
      // both "(correct answer)" (unchosen) and "(your answer — correct)"
      // (chosen) are the same green; only a chosen-and-wrong option is red.
      suffixEl.className = option.isCorrectOption ? "option-suffix-correct" : "option-suffix-incorrect";
      suffixEl.textContent = suffix;
      optionLi.appendChild(suffixEl);
    }
    optionsEl.appendChild(optionLi);
  }
  li.appendChild(optionsEl);

  if (!row.answered) {
    const notAnsweredEl = document.createElement("p");
    notAnsweredEl.textContent = "You did not answer this question.";
    li.appendChild(notAnsweredEl);
  }

  if (row.explanation) {
    const explanationEl = document.createElement("p");
    explanationEl.textContent = `Explanation: ${row.explanation}`;
    li.appendChild(explanationEl);
  }

  return li;
}
