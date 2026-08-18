// Pure expression-evaluation engine for the 5165 scientific calculator (Phase 5.2,
// D-14). TI-84 Plus CE-styled interaction (a "2nd" shift key remaps sin/cos/tan to
// their inverses, functions auto-open a parenthesis) but scoped functionally to
// D-14, not the real device: arithmetic, x^y/x^2/sqrt, log, ln, trig + inverse trig,
// parentheses, pi/e -- explicitly no graphing, matrices, or programming.
//
// Kept pure and DOM-free like every other js/*.js module in this codebase (schema.js,
// runner.js, srs.js, results.js) -- tokenize/parse/evaluate can be unit-tested under
// Node with no DOM, no calculator UI. run.html owns the keypad, the 2nd-shift button
// state, and rendering. Every entry point follows the same never-throws convention
// those modules use (loadStore/loadBank etc.) -- a malformed expression or a domain
// error (divide by zero, asin(2), log of a non-positive number) comes back as
// `{ok: false, reason}`, never an exception. Unlike those modules, `reason` here is
// not a short machine-readable code ("not-found", "fetch-failed") -- it's a full
// human-readable message meant to be shown directly in the calculator's result line.

const FUNCTION_NAMES = ["asin", "acos", "atan", "sin", "cos", "tan", "log", "ln", "sqrt"];
const CONSTANT_NAMES = ["pi", "e"];

/**
 * Splits a raw calculator input string into tokens. Whitespace is ignored. Function
 * and constant names are matched against the fixed lists above at each position --
 * an identifier that doesn't match one is rejected rather than silently dropped, so
 * a typo surfaces as an error instead of a wrong answer.
 *
 * @param {string} input
 * @returns {{ok: true, tokens: object[]} | {ok: false, reason: string}}
 */
export function tokenize(input) {
  const tokens = [];
  const s = input;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];

    if (/\s/.test(ch)) {
      // Skipped, not stripped up front: whitespace only separates tokens (so
      // "2 + 3" reads the same as "2+3") -- it must NOT silently merge two
      // otherwise-adjacent numbers together (a pre-strip would turn "3 4" into
      // the single number 34, hiding a real syntax error).
      i++;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(s[i + 1] ?? ""))) {
      let j = i;
      let sawDot = false;
      while (j < s.length && (/[0-9]/.test(s[j]) || (s[j] === "." && !sawDot))) {
        if (s[j] === ".") sawDot = true;
        j++;
      }
      const numStr = s.slice(i, j);
      const value = Number(numStr);
      if (!Number.isFinite(value)) return { ok: false, reason: `"${numStr}" isn't a valid number` };
      tokens.push({ type: "number", value });
      i = j;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }

    const funcMatch = FUNCTION_NAMES.find((name) => s.startsWith(name, i));
    if (funcMatch) {
      tokens.push({ type: "func", value: funcMatch });
      i += funcMatch.length;
      continue;
    }
    const constMatch = CONSTANT_NAMES.find((name) => s.startsWith(name, i));
    if (constMatch) {
      tokens.push({ type: "const", value: constMatch });
      i += constMatch.length;
      continue;
    }

    return { ok: false, reason: `Unexpected character "${ch}"` };
  }
  return { ok: true, tokens };
}

/**
 * Parses a token stream into an expression tree via recursive descent, standard
 * precedence low to high: +/-, then implicit-none * and /, then unary +/-, then ^
 * (right-associative -- `2^-2` parses as `2^(-2)`, and `2^3^2` as `2^(3^2)`), then
 * function calls and parenthesized groups. Unary binds looser than ^ (the standard
 * mathematical convention, matching real calculators): `-2^2` is `-(2^2)` = -4, not
 * `(-2)^2` = 4. A function name must be followed by `(` -- there is no bare
 * `sin30`/`sinx` form -- matching how the calculator UI itself will auto-insert the
 * opening parenthesis the instant a function key is pressed.
 *
 * @param {object[]} tokens
 * @returns {{ok: true, ast: object} | {ok: false, reason: string}}
 */
export function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpression() {
    let left = parseTerm();
    if (!left.ok) return left;
    while (peek() && peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = consume().value;
      const right = parseTerm();
      if (!right.ok) return right;
      left = { ok: true, node: { type: "binary", op, left: left.node, right: right.node } };
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    if (!left.ok) return left;
    while (peek() && peek().type === "op" && (peek().value === "*" || peek().value === "/")) {
      const op = consume().value;
      const right = parseUnary();
      if (!right.ok) return right;
      left = { ok: true, node: { type: "binary", op, left: left.node, right: right.node } };
    }
    return left;
  }

  function parseUnary() {
    if (peek() && peek().type === "op" && (peek().value === "-" || peek().value === "+")) {
      const op = consume().value;
      const arg = parseUnary();
      if (!arg.ok) return arg;
      return { ok: true, node: { type: "unary", op, arg: arg.node } };
    }
    return parsePower();
  }

  function parsePower() {
    const base = parseAtom();
    if (!base.ok) return base;
    if (peek() && peek().type === "op" && peek().value === "^") {
      consume();
      const exponent = parseUnary();
      if (!exponent.ok) return exponent;
      return { ok: true, node: { type: "binary", op: "^", left: base.node, right: exponent.node } };
    }
    return base;
  }

  function parseAtom() {
    const token = peek();
    if (!token) return { ok: false, reason: "Expression is incomplete" };

    if (token.type === "number") {
      consume();
      return { ok: true, node: { type: "number", value: token.value } };
    }
    if (token.type === "const") {
      consume();
      return { ok: true, node: { type: "const", value: token.value } };
    }
    if (token.type === "lparen") {
      consume();
      const inner = parseExpression();
      if (!inner.ok) return inner;
      if (!peek() || peek().type !== "rparen") return { ok: false, reason: "Missing closing parenthesis" };
      consume();
      return inner;
    }
    if (token.type === "func") {
      consume();
      if (!peek() || peek().type !== "lparen") {
        return { ok: false, reason: `"${token.value}" needs an opening parenthesis` };
      }
      consume();
      const inner = parseExpression();
      if (!inner.ok) return inner;
      if (!peek() || peek().type !== "rparen") return { ok: false, reason: "Missing closing parenthesis" };
      consume();
      return { ok: true, node: { type: "call", name: token.value, arg: inner.node } };
    }
    return { ok: false, reason: "Unexpected token" };
  }

  const result = parseExpression();
  if (!result.ok) return result;
  if (pos < tokens.length) return { ok: false, reason: "Unexpected trailing input" };
  return { ok: true, ast: result.node };
}

const DEG_PER_RAD = 180 / Math.PI;

function toRadians(x, angleMode) {
  return angleMode === "deg" ? x / DEG_PER_RAD : x;
}
function fromRadians(x, angleMode) {
  return angleMode === "deg" ? x * DEG_PER_RAD : x;
}

/**
 * Evaluates a parsed expression tree. `angleMode` controls sin/cos/tan's *input*
 * unit and asin/acos/atan's *output* unit alike -- a real calculator's mode setting
 * affects trig both directions, not just one, and getting only one direction right
 * would silently produce a wrong answer for exactly half of the scoped functions.
 *
 * @param {object} node
 * @param {{angleMode?: "deg" | "rad"}} [options]
 * @returns {{ok: true, value: number} | {ok: false, reason: string}}
 */
export function evaluate(node, { angleMode = "deg" } = {}) {
  switch (node.type) {
    case "number":
      return { ok: true, value: node.value };
    case "const":
      return { ok: true, value: node.value === "pi" ? Math.PI : Math.E };
    case "unary": {
      const arg = evaluate(node.arg, { angleMode });
      if (!arg.ok) return arg;
      return { ok: true, value: node.op === "-" ? -arg.value : arg.value };
    }
    case "binary": {
      const left = evaluate(node.left, { angleMode });
      if (!left.ok) return left;
      const right = evaluate(node.right, { angleMode });
      if (!right.ok) return right;
      if (node.op === "+") return { ok: true, value: left.value + right.value };
      if (node.op === "-") return { ok: true, value: left.value - right.value };
      if (node.op === "*") return { ok: true, value: left.value * right.value };
      if (node.op === "/") {
        if (right.value === 0) return { ok: false, reason: "Division by zero" };
        return { ok: true, value: left.value / right.value };
      }
      // "^"
      const value = Math.pow(left.value, right.value);
      if (!Number.isFinite(value)) return { ok: false, reason: "Result is out of range" };
      return { ok: true, value };
    }
    case "call": {
      const arg = evaluate(node.arg, { angleMode });
      if (!arg.ok) return arg;
      const x = arg.value;
      switch (node.name) {
        case "sin":
          return { ok: true, value: Math.sin(toRadians(x, angleMode)) };
        case "cos":
          return { ok: true, value: Math.cos(toRadians(x, angleMode)) };
        case "tan":
          return { ok: true, value: Math.tan(toRadians(x, angleMode)) };
        case "asin":
          if (x < -1 || x > 1) return { ok: false, reason: "sin⁻¹ is only defined on [-1, 1]" };
          return { ok: true, value: fromRadians(Math.asin(x), angleMode) };
        case "acos":
          if (x < -1 || x > 1) return { ok: false, reason: "cos⁻¹ is only defined on [-1, 1]" };
          return { ok: true, value: fromRadians(Math.acos(x), angleMode) };
        case "atan":
          return { ok: true, value: fromRadians(Math.atan(x), angleMode) };
        case "log":
          if (x <= 0) return { ok: false, reason: "log is only defined for x > 0" };
          return { ok: true, value: Math.log10(x) };
        case "ln":
          if (x <= 0) return { ok: false, reason: "ln is only defined for x > 0" };
          return { ok: true, value: Math.log(x) };
        case "sqrt":
          if (x < 0) return { ok: false, reason: "√ is only defined for x ≥ 0" };
          return { ok: true, value: Math.sqrt(x) };
        default:
          return { ok: false, reason: `Unknown function "${node.name}"` };
      }
    }
    default:
      return { ok: false, reason: "Unrecognized expression" };
  }
}

/**
 * Tokenize, parse, and evaluate in one call -- the shape run.html actually needs
 * when "=" is pressed. Never throws (matches loadStore/loadBank's tagged-result
 * convention): a malformed expression, an unrecognized character, or a domain error
 * all come back as `{ok: false, reason}` with a short human-readable message rather
 * than an exception the UI would need to catch.
 *
 * @param {string} input
 * @param {{angleMode?: "deg" | "rad"}} [options]
 * @returns {{ok: true, value: number} | {ok: false, reason: string}}
 */
export function evaluateExpression(input, { angleMode = "deg" } = {}) {
  if (typeof input !== "string" || input.trim() === "") {
    return { ok: false, reason: "Nothing to evaluate" };
  }
  const tokenResult = tokenize(input);
  if (!tokenResult.ok) return tokenResult;
  const parseResult = parse(tokenResult.tokens);
  if (!parseResult.ok) return parseResult;
  const evalResult = evaluate(parseResult.ast, { angleMode });
  if (!evalResult.ok) return evalResult;
  if (!Number.isFinite(evalResult.value)) return { ok: false, reason: "Result is not a finite number" };
  return { ok: true, value: evalResult.value };
}
