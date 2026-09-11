# Legal considerations — primer, not legal advice

> **Status, 2026-09-11 — read this alongside [D-40](../DECISIONS.md).** Two things below have
> since been settled. The attorney consult this primer prepares for was **deliberately not
> pursued** (D-40), so this written guidance is the only guidance rather than a floor beneath a
> professional opinion. And the trademark question it raises was **answered**: PRAXIS is ETS's
> live registered mark, Class 9 included, so it cannot be the app's name. The "private practice
> tool for one person, not urgent" framing below predates the App Store plan (D-41, D-42) and no
> longer describes the project. The actionable checklist now lives in
> [APP-STORE-ROADMAP.md](../APP-STORE-ROADMAP.md), Phases A–B.

This document is a **primer for a real conversation with an IP/trademark
attorney**, not a substitute for one. It exists so the issues are tracked
somewhere durable instead of living only in a past chat, and so "did we think
about X" has a checklist to point to before this project is ever published or
monetized. Nothing here should be treated as legal advice or relied on as a
final answer.

**Current status: not urgent.** This app is a private practice tool for one
person. Every risk below scales with *visibility and distribution* — a
sideloaded personal app has essentially none of it. This document only
becomes load-bearing at the point this project is seriously heading toward
public/App Store distribution, and the action item at that point is "pay a
real attorney for an hour," not "re-read this file and proceed."

## Two different legal categories, easy to conflate

- **Copyright** protects ETS's actual *expression* — their specific exam
  questions, answer choices, explanations, and the *Study Companion* PDFs'
  prose. This is a content-authoring rule, already established and actively
  enforced in the source project:
  [PRAXIS-Practice](../PRAXIS-Practice)'s `CLAUDE.md` and
  `.claude/skills/dev-workflow/SKILL.md` ("The ETS copyright rule" section).
  Every question and every teaching chapter this iOS app displays is bundled
  from that project, so that rule is what actually protects this app's
  content — nothing new needs to be decided here, just kept honored at the
  source.
- **Trademark** protects ETS's *name* — "Praxis®" and "The Praxis® Series"
  are registered trademarks. This is a *naming and branding* question, not a
  content-authoring one, and it's specific to this app (and any future
  sibling app), since PRAXIS-Practice itself is a private dev repo, not a
  published product.

## The naming/branding question

- Using "Praxis" as *this app's own brand/product name* (e.g., an App Store
  listing literally titled "PRAXIS Study Guide") is the riskier move — it
  can imply ETS made or endorsed it.
- Truthfully *describing* what the app is for — "a study guide for the
  Praxis® 5165 Mathematics exam," with a disclaimer — is the pattern every
  existing third-party prep company (Mometrix, 240 Tutoring, Study.com,
  etc.) already uses under a doctrine called **nominative fair use**: naming
  a trademark to accurately describe compatibility is generally fine; using
  it *as* your own brand identity is not.
- **Working guidance until a lawyer confirms otherwise**: pick a distinct
  product name that isn't "Praxis [anything]," reference the real exam name
  only descriptively in the description/subtitle, and include a disclaimer
  such as *"Praxis® is a registered trademark of ETS, which does not endorse
  this product."*

## Other risks flagged, separate from ETS specifically

- **Don't imply ETS endorsement anywhere** — App Store description, icon
  design, color scheme, or copy that could read as "official" or
  "authorized," not just the product name itself.
- **Avoid guarantee-style claims** ("guaranteed to pass," etc.) — this is a
  consumer-protection/advertising-law risk, unrelated to ETS or trademark
  law at all, and applies to any test-prep product regardless of naming.
- **Competing with other prep companies is not itself a legal issue.**
  Worth stating plainly since it's an easy thing to conflate: building a
  study app that competes with Mometrix or 240 Tutoring for the same
  customers is ordinary competition, not infringement of anything. The only
  real exposure is specifically ETS's copyright (content) and trademark
  (naming) — not the existence of competitors.

## Before-publication checklist

Not exhaustive, not a substitute for the actual consult — just the concrete
things this primer identified as worth bringing to that conversation:

- [ ] Final app name and App Store listing copy reviewed against the
      nominative-fair-use guidance above.
- [ ] Icon/branding checked for anything that could read as ETS-affiliated.
- [ ] No guarantee-style marketing claims anywhere in App Store copy or
      in-app text.
- [ ] A real trademark/IP attorney consult booked and completed **before**
      the app is submitted for public/App Store distribution or monetized
      in any way — not after.
- [ ] Re-confirm PRAXIS-Practice's content-authoring rule is still being
      honored for any new content authored directly in this app (if that
      ever diverges from the shared source project).
- [ ] Bundle identifier (`DECISIONS.md` D-6, `com.homesik92.PraxisMath`)
      confirmed as final with the session owner **before** first App Store
      Connect registration — that registration is the actual permanent
      lock-in moment, not today.

## Trigger to revisit this document

Re-read and update this before any of the following, whichever comes first:
first App Store submission, any paid/monetized version, any public
announcement or marketing beyond personal use, or a second subject app
(5652) reaching the same stage.
