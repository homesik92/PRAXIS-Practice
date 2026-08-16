# Test Blueprints

Structural facts for the four in-scope Praxis Subject Assessments, extracted from ETS's
published *Study Companion* for each test.

**What this file is.** Test codes, time limits, question counts, content-category names,
and their published weightings — facts about how each exam is built. Category counts
below were checked to sum exactly to each test's stated total.

**What this file is not.** No ETS question, answer choice, explanation, figure, or
extended prose appears here or anywhere in this repository. See "The ETS copyright rule"
in `.claude/skills/dev-workflow/SKILL.md`. Praxis® is a registered trademark of ETS;
this project is unaffiliated with and not endorsed by ETS.

**Source.** The four PDFs in `Knowledge-Guides/` (gitignored). ETS revises study
companions periodically and these figures should be re-checked against the current
edition before any bank is called complete.

---

## Summary

| Code | Test | Time | Questions | Pace | ETS-stated format |
| --- | --- | --- | --- | --- | --- |
| 5101 | Business Education: Content Knowledge | 120 min | 120 | 1.0 min/q | Selected-response **and numeric entry** |
| 5165 | Mathematics | 180 min | 66 | 2.7 min/q | Selected-response (**select one _or more_**), **numeric entry**, and other types |
| 5485 | Physical Science | 150 min | 125 | 1.2 min/q | Selected-response |
| 5652 | Computer Science | 180 min | 100 | 1.8 min/q | Selected-response (**select one _or more_**) |

All four are computer-delivered, and all four state that some questions may not count
toward the score (unscored pretest items). This project does not model unscored items —
every question in a bank counts.

**⚠ Only 5485 is described by ETS as plain selected-response.** The other three
explicitly include numeric entry, multi-select, or both. See "Open format question"
below — this is a design fork, not a detail.

---

## 5101 — Business Education: Content Knowledge

**120 minutes · 120 questions · 1.0 min/question**

| # | Content category | Qs | % | Subcategories |
| --- | --- | --- | --- | --- |
| I | Accounting and Finance | 18 | 15% | Accounting; Personal and Business Finance |
| II | Communication and Career Development | 18 | 15% | Foundations of Communications; Written and Oral Communications; Employment Communication; Career Research |
| III | Economics | 12 | 10% | Allocation of Resources; Economic Systems; Market Structures; Role of Government; Economic Indicators |
| IV | Entrepreneurship | 12 | 10% | Characteristics; Entrepreneurial Opportunities; Forms of Ownership; Business Plans |
| V | Information Technology | 18 | 15% | Operations and Concepts; Human Factor; Technology Tools |
| VI | Law and International Business | 12 | 10% | Foundations of International Business; International Business Environment; Trade Relations; Contract Law; Consumer Law; Computer Law |
| VII | Marketing and Management | 18 | 15% | Marketing; Management |
| VIII | Professional Business Education | 12 | 10% | Professional Organizations; CTE Legislation; School and Community Relationships; Mission and Objectives; Pedagogy; Work-Based Learning |

Notes: a calculator is permitted (no QWERTY keyboard). Built against the NBEA National
Standards for Business Education (2020). The widest topic spread of the four — 33
subcategories across 8 categories.

## 5165 — Mathematics

**180 minutes · 66 questions · 2.7 min/question**

The only test of the four that publishes weightings **below** the top level, so the
subcategory split is authoritative rather than inferred:

| # | Content category | Qs | % |
| --- | --- | --- | --- |
| I | Number & Quantity and Algebra | 20 | 30% |
| I-A | — Number and Quantity | 7 | 10% |
| I-B | — Algebra | 13 | 20% |
| II | Functions and Calculus | 20 | 30% |
| II-A | — Functions | 13 | 20% |
| II-B | — Calculus | 7 | 10% |
| III | Geometry | 13 | 20% |
| IV | Statistics & Probability | 13 | 20% |

Notes: categories III and IV are not subdivided. An **on-screen graphing calculator** is
provided, and a notation/formula reference is available during the test — if the site
does not offer an equivalent, a practice score will understate readiness on
calculator-dependent items. **Approximately 25% of questions apply mathematics to a
"Task of Teaching Mathematics"** — a pedagogical framing rather than a pure content
question. Aligned to Common Core (2010), NCTM/CAEP (2012), and NCTM PSSM (2000).

## 5485 — Physical Science

**150 minutes · 125 questions · 1.2 min/question**

| # | Content category | Qs | % | Subcategories |
| --- | --- | --- | --- | --- |
| I | Nature and Impact of Science and Engineering | 18 | 14% | Nature of Science; Science, Engineering, Technology, Society, and the Environment |
| II | Principles and Models of Matter and Energy | 25 | 20% | Atomic and Nuclear Structure and Processes; Relationships Between Energy and Matter |
| III | Chemistry | 41 | 33% | Chemical Composition, Bonding, and Structure; Chemical Reactions and Periodicity; Solutions and Acid-Base Chemistry |
| IV | Physics | 41 | 33% | Mechanics; Electricity, Magnetism, and Waves |

Notes: **no calculator is needed**, and a periodic table plus a physical-constants table
are provided on a Help screen — the site needs an equivalent reference or chemistry
items become memorization tests. Two cross-cutting overlays sit on top of the content
categories: **half or more** of questions integrate a Science and Engineering Practice,
and **one-quarter to one-third** apply content to a Task of Teaching Science. Aligned to
the NGSS framework (DCIs and SEPs).

## 5652 — Computer Science

**180 minutes · 100 questions · 1.8 min/question**

| # | Content category | Qs | % |
| --- | --- | --- | --- |
| I | Impacts of Computing | 15 | 15% |
| II | Algorithms and Computational Thinking | 25 | 25% |
| III | Programming | 30 | 30% |
| IV | Data | 15 | 15% |
| V | Computing Systems and Networks | 15 | 15% |

Subcategory coverage, condensed to topic labels (ETS words these as full
"understands and applies knowledge of…" sentences rather than as headings, so these are
shortened labels for display, not quotations):

- **I** — impact of and obstacles to computing; intellectual property, ethics, privacy, security
- **II** — abstraction, pattern recognition, problem decomposition, number bases; algorithm analysis, searching and sorting
- **III** — control structures and standard operators; procedures, event-driven programs, usability, data
- **IV** — digitalization, encryption/decryption; simulation, modeling, and data manipulation
- **V** — operating systems, computing systems, inter-device communication; networks, security, the Web

Notes: the test is **language-agnostic** — ETS publishes a pseudocode notation and code
items are written in it, so the bank must use that same neutral pseudocode rather than
Python or Java. Not aligned to any single curriculum; consistent with the K-12 CS
Framework (2016), CSTA standards (2017), and ISTE Computational Thinking Competencies.

---

## Findings for the design sessions

**F-1 — The v1 authoring load is 411 questions.** One full-length attempt per test is
120 + 66 + 125 + 100. This is the dominant cost in the entire project, and it is content
work rather than code work.

Sizing it in this project's own unit — a working session — rather than in calendar time,
which depends entirely on how often sessions happen:

| Work | Rough size | Basis |
| --- | --- | --- |
| The engine (Phases 0–3: manifest loading, runner, timer, scoring, dashboard, persistence) | ~4–6 sessions | Bounded, well-specified by this document and SCHEMA.md |
| The 411-question bank | ~15–20 sessions | Assumes ~20–30 questions per session, authored *and* answer-key-verified |

So the bank is roughly three to four times the engine. Both figures are estimates with
real uncertainty — the bank figure especially, since per-session throughput has not been
measured yet and Mathematics and Physical Science will be slower than Business per
question. **The first authoring session should be treated as a measurement**, and this
table revised from it.

The bank is also the part that cannot be rushed, because a wrong answer key is worse
than a missing question. Sequencing should therefore assume banks land incrementally and
the site must be useful — and honest about its own coverage — while a bank is partly
filled.

**F-2 — Category weightings must drive question selection, not just documentation.** A
full-length 5485 attempt is not 125 random questions; it is 18/25/41/41 drawn per
category. The bank schema needs enough per-question metadata to assemble a
weight-correct form, and needs to behave sensibly when a category is underfilled.

**F-3 — Reference materials are part of the exam.** 5165 provides a graphing calculator
and formula sheet; 5485 provides a periodic table and constants table. Practice without
them measures something different from the real test. Scope decision needed.

**F-4 — Two tests have cross-cutting overlays** (5165's Task of Teaching ~25%; 5485's
SEP ≥50% and Task of Teaching ~25–33%). These are orthogonal to content category — a
question has a category *and* may carry an overlay tag. If the schema models category
as the only axis, these become unrepresentable.

**F-5 — 5652 requires pseudocode, not a real language.** Using Python in the bank would
teach syntax the exam does not test.

**F-6 — Topic granularity differs sharply between tests.** 5101 has 33 subcategories;
5165 has 6 and publishes weights for 4 of them; 5485 has 9; 5652 has 10 written as
sentences. "Study a particular topic" therefore cannot assume a uniform depth — the
schema needs a category tree of variable depth, not a fixed two-level scheme.

## Open format question

The stated interaction requirement is **four options, exactly one correct**. ETS
describes only 5485 that way. 5165 and 5652 explicitly include *select one or more*
answers, and 5101 and 5165 include *numeric entry*.

Uniform 4-option single-select is by far the simpler engine — one input control, one
scoring rule, one review view. The cost is that practice diverges from the real exam
format on three of the four tests, and multi-select in particular is a distinct skill:
partial knowledge that earns credit on a single-select item earns nothing on a
select-all item.

This is a design fork for the session owner, not a detail to settle in the schema.
