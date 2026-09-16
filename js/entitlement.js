// D-46/D-19: whether test.html's paid controls render locked, inside the iOS app.
//
// Purchase state never enters the web layer (D-19) -- the app passes exactly one
// signal, an `unlocked` query param on the page's own URL, and this module is the
// one place that turns that signal (plus the store's own free-trial record) into a
// per-control lock decision. No price, no product id, no StoreKit concept lives here
// or anywhere else in this file's imports.
//
// Every function here is pure and DOM-free -- same convention as js/schema.js and
// js/store.js -- so this is unit-testable under Node; see tools/test-entitlement.mjs.
// `isNativeContext` returning false must make every other function in this module
// report "nothing is locked": that's the load-bearing property behind #131's "the
// public website is unaffected by construction" -- a plain browser visiting the site
// never sends an `unlocked` param at all, so this module never has anything to lock.

import { hasUsedCategoryTrial } from "./store.js";

/**
 * Whether this page load is running inside the native app at all, as opposed to a
 * plain browser visiting the public site. The app always supplies `unlocked` (as
 * `"1"` or `"0"`); the public site never does, by construction (there is nothing in
 * `index.html`'s or `test.html`'s own links that would ever add it).
 *
 * @param {URLSearchParams} params
 * @returns {boolean}
 */
export function isNativeContext(params) {
  return params.get("unlocked") !== null;
}

/**
 * Whether the app reports this subject as purchased. Only meaningful when
 * `isNativeContext(params)` is true -- on the public site, where `unlocked` is
 * always absent, this returns `true`, matching "nothing is locked there."
 *
 * @param {URLSearchParams} params
 * @returns {boolean}
 */
export function isUnlocked(params) {
  return params.get("unlocked") !== "0";
}

/**
 * Which of test.html's controls should render locked, given the native context, the
 * subject's purchase state, and (for Category test specifically) whichever topic is
 * currently selected in its own picker. "Study a topic" is deliberately absent from
 * the result -- D-46 keeps it free unconditionally, so no caller ever needs to ask.
 *
 * Category test is the one control whose lock state depends on *which* topic is
 * selected, not just on whether the subject is purchased: D-46's free tier is one
 * trial per topic, so a topic not yet tried stays unlocked even on a locked subject,
 * while an already-tried topic locks the moment the subject itself isn't purchased.
 *
 * @param {object} store
 * @param {string} testCode
 * @param {URLSearchParams} params
 * @param {string | null} selectedCategoryTestTopicId
 * @returns {{fullTest: boolean, practiceTopic: boolean, reviewTopic: boolean, categoryTest: boolean}}
 */
export function lockedControls(store, testCode, params, selectedCategoryTestTopicId) {
  if (!isNativeContext(params) || isUnlocked(params)) {
    return { fullTest: false, practiceTopic: false, reviewTopic: false, categoryTest: false };
  }
  // No topic selected yet has nothing to be free for -- locked defensively (a
  // paywall gate fails toward the safer default when it can't determine trial
  // status) rather than assumed still-open.
  const categoryTest = selectedCategoryTestTopicId
    ? hasUsedCategoryTrial(store, testCode, selectedCategoryTestTopicId)
    : true;
  return { fullTest: true, practiceTopic: true, reviewTopic: true, categoryTest };
}

/**
 * Carries this page's `unlocked` param forward onto an in-app link. The signal lives
 * only on the page's own URL, so a link built without it lands on a page that
 * believes it's the public site -- where nothing is locked. Every link from one site
 * page to another goes through this. A no-op on the public site. Assumes `href` has
 * no `#fragment` (none of this site's internal links do).
 *
 * @param {string} href
 * @param {URLSearchParams} params
 * @returns {string}
 */
export function withEntitlementParam(href, params) {
  if (!isNativeContext(params)) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}unlocked=${encodeURIComponent(params.get("unlocked"))}`;
}

/**
 * Whether run.html should refuse to start the run its own URL describes. This is the
 * destination-side gate: test.html's controls lock themselves, but run.html is also
 * reached from test.html's dashboard shortcuts, its own "Try again" link, and
 * results.html's weak-spot links, so the decision is made again here rather than
 * trusted to every link site. Maps each mode onto the test.html control it belongs to:
 * `test` is Full test, `study` (including due review) is Review a topic, `drill` is
 * Practice a topic, and `drill` with `timed=1` is Category test. An unknown or missing
 * mode returns false -- run.html reports those itself.
 *
 * @param {object} store
 * @param {string} testCode
 * @param {URLSearchParams} params - run.html's own query params
 * @returns {boolean}
 */
export function isRunLocked(store, testCode, params) {
  const mode = params.get("mode");
  const timed = params.get("timed") === "1";
  const locked = lockedControls(store, testCode, params, mode === "drill" && timed ? params.get("category") : null);
  if (mode === "test") return locked.fullTest;
  if (mode === "study") return locked.reviewTopic;
  if (mode === "drill") return timed ? locked.categoryTest : locked.practiceTopic;
  return false;
}
