// Unit tests for js/calculator.js. Pure Node, no dependencies. Run: node tools/test-calculator.mjs
import assert from "node:assert/strict";
import { tokenize, parse, evaluate, evaluateExpression } from "../js/calculator.js";

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function evalOk(input, options) {
  const result = evaluateExpression(input, options);
  assert.equal(result.ok, true, `expected "${input}" to evaluate, got: ${result.ok ? "" : result.reason}`);
  return result.value;
}

function assertClose(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) < epsilon, `expected ${actual} to be close to ${expected}`);
}

// --- Arithmetic and precedence ---

test("basic arithmetic operators", () => {
  assert.equal(evalOk("2+3"), 5);
  assert.equal(evalOk("5-3"), 2);
  assert.equal(evalOk("4*3"), 12);
  assert.equal(evalOk("10/4"), 2.5);
});

test("multiplication/division bind tighter than addition/subtraction", () => {
  assert.equal(evalOk("2+3*4"), 14);
  assert.equal(evalOk("2*3+4"), 10);
  assert.equal(evalOk("10-4/2"), 8);
});

test("parentheses override default precedence", () => {
  assert.equal(evalOk("(2+3)*4"), 20);
  assert.equal(evalOk("2*(3+4)"), 14);
});

test("division by zero is a tagged failure, not Infinity or a throw", () => {
  const result = evaluateExpression("5/0");
  assert.equal(result.ok, false);
  assert.match(result.reason, /zero/i);
});

// --- Unary minus and exponents ---

test("unary minus binds looser than exponentiation: -2^2 is -(2^2), not (-2)^2", () => {
  assert.equal(evalOk("-2^2"), -4);
  assert.equal(evalOk("(-2)^2"), 4);
});

test("exponentiation is right-associative: 2^3^2 is 2^(3^2)", () => {
  assert.equal(evalOk("2^3^2"), 512); // not (2^3)^2 = 64
});

test("a negative exponent works directly after ^ with no extra parentheses", () => {
  assert.equal(evalOk("2^-2"), 0.25);
});

test("x^2 (the calculator's x² button inserts ^2) squares correctly", () => {
  assert.equal(evalOk("5^2"), 25);
  assert.equal(evalOk("(-3)^2"), 9);
});

test("a result outside the range of finite numbers is a tagged failure, not Infinity", () => {
  const result = evaluateExpression("10^1000");
  assert.equal(result.ok, false);
});

// --- sqrt, log, ln ---

test("sqrt", () => {
  assert.equal(evalOk("sqrt(9)"), 3);
  assert.equal(evalOk("sqrt(2)*sqrt(2)"), Math.sqrt(2) * Math.sqrt(2));
});

test("sqrt of a negative number is a domain error, not NaN", () => {
  const result = evaluateExpression("sqrt(-1)");
  assert.equal(result.ok, false);
  assert.match(result.reason, /√|sqrt/i);
});

test("log is base 10, ln is natural log", () => {
  assert.equal(evalOk("log(100)"), 2);
  assertClose(evalOk("ln(e)"), 1);
});

test("log/ln of a non-positive number is a domain error, not NaN or -Infinity", () => {
  assert.equal(evaluateExpression("log(0)").ok, false);
  assert.equal(evaluateExpression("log(-5)").ok, false);
  assert.equal(evaluateExpression("ln(0)").ok, false);
});

// --- Trig, both angle modes, both directions ---

test("sin/cos/tan in degree mode (the default)", () => {
  assertClose(evalOk("sin(90)", { angleMode: "deg" }), 1);
  assertClose(evalOk("cos(0)", { angleMode: "deg" }), 1);
  assertClose(evalOk("tan(45)", { angleMode: "deg" }), 1);
});

test("sin/cos/tan in radian mode", () => {
  assertClose(evalOk("sin(pi/2)", { angleMode: "rad" }), 1);
  assertClose(evalOk("cos(0)", { angleMode: "rad" }), 1);
});

test("inverse trig respects angle mode on its OUTPUT, not just input trig on its input", () => {
  assertClose(evalOk("asin(1)", { angleMode: "deg" }), 90);
  assertClose(evalOk("asin(1)", { angleMode: "rad" }), Math.PI / 2);
  assertClose(evalOk("atan(1)", { angleMode: "deg" }), 45);
});

test("asin/acos outside [-1, 1] is a domain error, not NaN", () => {
  const result = evaluateExpression("asin(2)");
  assert.equal(result.ok, false);
  assert.match(result.reason, /sin⁻¹|domain|\[-1, 1\]/i);
});

test("atan has no domain restriction", () => {
  assertClose(evalOk("atan(1000)", { angleMode: "rad" }), Math.atan(1000));
});

// --- Constants ---

test("pi and e constants", () => {
  assertClose(evalOk("pi"), Math.PI);
  assertClose(evalOk("e"), Math.E);
  assertClose(evalOk("2*pi"), 2 * Math.PI);
});

// --- Malformed input ---

test("an unmatched opening parenthesis is a tagged failure", () => {
  assert.equal(evaluateExpression("(2+3").ok, false);
});

test("an unmatched closing parenthesis is a tagged failure", () => {
  assert.equal(evaluateExpression("2+3)").ok, false);
});

test("a trailing operator with nothing after it is a tagged failure", () => {
  assert.equal(evaluateExpression("2+").ok, false);
});

test("an unrecognized character is a tagged failure", () => {
  assert.equal(evaluateExpression("2 & 3").ok, false);
});

test("a function name with no opening parenthesis is a tagged failure", () => {
  assert.equal(evaluateExpression("sin30").ok, false);
});

test("empty or whitespace-only input is a tagged failure, not a throw", () => {
  assert.equal(evaluateExpression("").ok, false);
  assert.equal(evaluateExpression("   ").ok, false);
});

test("evaluateExpression never throws on garbage input", () => {
  for (const garbage of ["(((", ")))", "^^^", "..", "1..2", "sin(", "log()", null, undefined, 42]) {
    assert.doesNotThrow(() => evaluateExpression(garbage));
  }
});

// --- tokenize / parse as separate stages (not just the convenience wrapper) ---

test("tokenize splits numbers, operators, parens, functions, and constants correctly", () => {
  const result = tokenize("sin(2.5+pi)*3");
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.tokens.map((t) => t.type),
    ["func", "lparen", "number", "op", "const", "rparen", "op", "number"],
  );
});

test("parse rejects unexpected trailing input after a complete expression", () => {
  const tokenResult = tokenize("2+3 4");
  assert.equal(tokenResult.ok, true);
  const parseResult = parse(tokenResult.tokens);
  assert.equal(parseResult.ok, false);
});

test("evaluate is usable directly on a parsed AST, independent of the string-based wrapper", () => {
  const ast = parse(tokenize("3+4").tokens).ast;
  const result = evaluate(ast, { angleMode: "deg" });
  assert.equal(result.ok, true);
  assert.equal(result.value, 7);
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL  ${name}`);
    console.log(`      ${e.message}`);
  }
}

console.log(`\n${tests.length - failed}/${tests.length} passed.`);
process.exitCode = failed > 0 ? 1 : 0;
