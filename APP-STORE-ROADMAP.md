# App Store Roadmap

The path from **working software** to **an approved app on the App Store**. It continues
[ROADMAP.md](ROADMAP.md)'s phase sequence — **Phase 11 ends where Phase 12 below begins** —
but lives in its own file so release work can be tracked and followed up without wading
through development phases.

> **Phase numbering changed on 2026-09-15 (N-20).** These phases were lettered **A–K** until
> then, and decision-log entries written before that date cite the letters; the log is
> append-only, so those citations stand. The mapping:
>
> | Was | A | B | C | D | E | F | G | H | I | J | K |
> |---|---|---|---|---|---|---|---|---|---|---|---|
> | **Now** | **12** | **13** | **14** | **15** | **16** | **17** | **18** | **19** | **20** | **21** | **22** |
>
> So D-41's "phase K.4" is **22.4**, D-40's "phase A" is **12**, and N-14's "phase E" is **16**.

**This document is a reusable template, not a one-app plan.** Under **D-41** this
project ships three apps (STEM, Humanities, Administrative), and the sequence below is
meant to be run once per app. Phases 12–13 are largely one-time identity work shared by
every app; 14 is once per Apple account; 15–22 repeat per app.

> **Not legal advice.** Under **D-40** the session owner has deliberately chosen not to
> pursue the attorney consult `LEGAL.md` calls for, which makes `LEGAL.md`'s written
> guidance the *only* guidance rather than a floor beneath a professional opinion. The
> legal items below are therefore recorded as steps to follow, not as advice given.

---

## Per-app status

Update this table as each app moves. Phase numbers refer to the sections below, and
continue [ROADMAP.md](ROADMAP.md)'s sequence — Phase 11 there is the native work that
precedes all of this.

| App | Subjects | Phase reached | Status | Notes |
| --- | --- | --- | --- | --- |
| **STEM** | 5165, 5436, 5485, 5652 | 12 | ☐ not started | Ships first (D-41). Nearly the current build already |
| **Humanities** | 5581 + future English/history | — | ☐ not started | 5581's bank is scaffold-only and paused |
| **Core** | 5713, 5723, 5733 | — | ⛔ parked | Fourth track and fourth app (**D-43**). **Not a data-only addition** — see N-16 and BLUEPRINT.md before scheduling |
| **Administrative** | 5101 + future admin/librarian | — | ☐ not started | 5101 moves here from the current build |

**Ship the STEM app and get it approved before submitting the second** (D-41). Four tracks exist in total — STEM, Humanities, Administrative and Core (**D-43**) — but Core is parked and its engine work is unscheduled. If Apple
raises Guideline 4.3(a) against a second, near-identical binary, that is far cheaper to
discover with one app already live than with three in review.

---

## Phase 12 — Identity: name, mark, and domains

One-time per product name. Gates everything downstream, because the bundle id derives
from the name and **bundle ids are permanent** (Phase 15).

- ☐ **12.1 Pick a product name that is not "Praxis [anything]."** Per **D-40**, PRAXIS is
  ETS's live registered mark (Reg. 4,479,538, classes 9/16/35/41/42, renewed 21 May
  2024) and **Class 9 is downloadable practice tests and study guides** — this project's
  exact category. The exam may be named *descriptively* in the subtitle and description;
  it may not be the brand.
- ☐ **12.2 Screen the name on the App Store.** Names must be unique. Apple's public
  search API is the fastest check and needs no account:
  ```
  curl -s "https://itunes.apple.com/search?term=<name>&entity=software&country=us&limit=30"
  ```
  Look for collisions **in the Education category especially** — a same-category prior
  user is the one that matters. *(This screen found "First Bell" already taken by an
  Education app, and "Chalkline" taken by two, before either was committed to.)*
- ☐ **12.3 Run a USPTO clearance search** at <https://www.uspto.gov/trademarks/search>,
  **classes 9 and 41**. Self-service, ~5 minutes. ⚠ An App Store screen is *not* a
  clearance search — it finds app names, not registered marks.
- ☐ **12.4 Secure the domain and social handles.** Cheap, and they go fast once a name is
  public.
- ☐ **12.5 Use ™ from first public use.** Free, no filing, and it establishes a claim.
  **Never use ® before a registration actually issues** — doing so is unlawful. (The ®
  on ETS's site is exactly what proved their mark was real.)
- ☐ **12.6 Decide whether to register federally.** Optional. Roughly $350 per class,
  8–18 months. An **intent-to-use** filing can lock priority before launch. Rights arise
  from use regardless; registration buys nationwide scope and enforcement leverage.

## Phase 13 — Legal and content posture

Per app, but mostly inherited once established.

- ☐ **13.1 Disclaimer present** in the app and the listing: *"Praxis® is a registered
  trademark of ETS, which does not endorse this product."* The website already carries
  this pattern — match it rather than inventing wording.
- ☐ **13.2 Exam named descriptively only** in name, subtitle, keywords and description.
- ☐ **13.3 Icon and branding carry nothing that could read as ETS-affiliated.**
- ☐ **13.4 No guarantee-style claims** ("pass or your money back", score promises).
- ☐ **13.5 Originals-only content rule re-confirmed.** Every question written from the
  underlying skill, never adapted from ETS's study companions. **No tool can check
  this**, and it is the item that would be genuinely expensive to get wrong.
- ☐ **13.6 Privacy policy published at a public URL.** Required by App Store Connect even
  when an app collects nothing. Say plainly that progress stays on the device.

## Phase 14 — Apple account setup

Once per Apple Developer account, not per app. **Start early** — verification steps here
take days and are a common cause of a submission-day stall.

- ☐ **14.1 Apple Developer Program membership** active ($99/yr). One account publishes
  unlimited apps — a second account is deliberately *not* being bought (**N-14**).
- ☐ **14.1a Apple Small Business Program enrolled** — 15% commission instead of 30% below
  $1M/year. At D-42's price point this is most of the margin, and enrolment is not
  automatic.
- ☐ **14.2 Account type and seller name confirmed.** Individual accounts display the
  person's legal name publicly; Organization accounts display the legal entity (and need
  a D-U-N-S number). Check what customers will actually see.
- ☐ **14.3 Paid Applications Agreement accepted.** Nothing sells until this is in place.
- ☐ **14.4 Banking and tax forms complete and verified.** The slowest item on this page.
- ☐ **14.5 Certificates, identifiers and provisioning profiles** in order.

## Phase 15 — App Store Connect record ⚠ irreversible

- ☐ **15.1 Bundle id finalised.** **This is the permanent lock-in moment.** Once a record
  exists the identifier cannot be changed or reused. Derive it from the chosen product
  name, never from "Praxis". *(The current `com.homesik92.PraxisMath` fails on both
  counts — it encodes the superseded Math-only structure and leans on the mark.)*
- ☐ **15.2 App record created** with primary language, category (Education) and name.
- ☐ **15.3 In-app purchase product registered.** Under **D-42** each app is free to
  download with **one** non-consumable unlock (teaching chapters and a short diagnostic
  free; full timed tests and the complete bank paid), indicatively $9.99–$14.99. One
  product per app, not one per subject.
  Product ids are also permanent. Not needed to *develop* the purchase flow — a local
  `.storekit` configuration file exercises purchase, restore and entitlement updates
  with no App Store Connect record at all.

## Phase 16 — Metadata and assets

- ☐ **16.1 App name** (30 chars) — the brand.
- ☐ **16.2 Subtitle** (30 chars) — where the exam is named descriptively.
- ☐ **16.3 Keywords** (100 chars, hidden). **Only name, subtitle and keywords are indexed
  for search — the description is not.** Include the individual test codes (5165, 5436,
  …): a candidate searching a specific code is high-intent and almost unopposed.

  ⚠ **ASO is not one channel among several here, it is the channel.** Under **D-42**
  lifetime value is a single one-time unlock — roughly $10 net of Apple's cut, with no
  repeat business — so paid acquisition converting at 5–15% of installs costs more per
  buyer than a buyer is worth. What is left: these three indexed fields, the test codes,
  teacher-preparation programmes (one lecturer recommending it to a cohort outweighs any
  ad), and reviews. **Ask for the review at the right moment** — right after a full
  practice test is completed with a good score, not on launch — because a
  short-lifecycle app loses the user shortly afterwards.
- ☐ **16.4 Description**, opening with what the app is and which exam it prepares for.
- ☐ **16.5 Screenshots** at every required device size, for every app.
- ☐ **16.6 App icon**, 1024×1024, no transparency, no rounded corners.
- ☐ **16.7 Age rating** questionnaire completed.
- ☐ **16.8 Privacy nutrition labels** — declare what is collected. If nothing leaves the
  device, say so.
- ☐ **16.9 Support URL** (required) and marketing URL (optional).

## Phase 17 — Build, sign, upload

- ☐ **17.1 Version and build numbers** set and incrementing.
- ☐ **17.2 Release archive** built and signed.
- ☐ **17.3 Uploaded to App Store Connect** and finished processing.

## Phase 18 — TestFlight

- ☐ **18.1 Internal testing** — install on a real device, not only a simulator.
- ☐ **18.2 Purchase flow exercised in the sandbox**, including **Restore Purchases**.
- ☐ **18.3 External testers**, if wanted. External builds need their own review pass.

## Phase 19 — Submit for review

- ☐ **19.1 Export compliance** answered (encryption usage).
- ☐ **19.2 Content rights** declared — this is where third-party material is disclosed.
- ☐ **19.3 Review notes written.** Say plainly that the app is unofficial practice
  material, unaffiliated with ETS, and that the exam is referenced descriptively.
  Reviewers see the trademark before they see the disclaimer.
- ☐ **19.4 Demo account** if any content sits behind a purchase or a login.
- ☐ **19.5 Submitted.**

## Phase 20 — Review and rejection handling

- ☐ **20.1 Respond to any rejection** in Resolution Center; fix and resubmit.
- ☐ **20.2 Record the rejection reason and the fix in the decision log** — rejections are
  the cheapest available education about Apple's actual posture, and apps two and three
  inherit whatever app one learns.

Reasons worth anticipating here: **4.3(a) spam** (multiple similar apps — the live
question under D-41), **5.2.1 intellectual property** (third-party marks in metadata),
**3.1.1 in-app purchase** (a missing Restore Purchases control is a routine rejection),
and **2.1 completeness**.

## Phase 21 — Release

- ☐ **21.1 Pricing and availability** set.
- ☐ **21.2 Phased release** decided.
- ☐ **21.3 Released**, and confirmed live on a device that never had a build installed.

## Phase 22 — Post-launch

- ☐ **22.1 Crash reports and analytics** watched for the first week.
- ☐ **22.2 Reviews monitored** — the first ones set the rating for a long time.
- ☐ **22.3 Content-update path exercised** at least once. ⚠ Saved progress lives in the
  device's web storage, **outside the app bundle, and survives every update**. Changing
  the shape or meaning of stored data can silently destroy a real study history with no
  backup. See `launch-and-cutover.md` in the dev-workflow skill.
- ☐ **22.4 Only then submit the next app** (D-41).

---

## What this document deliberately excludes

Everything up to "the software works": phases, features, question authoring, the
verification gate, and the native shell's own defects all stay in
[ROADMAP.md](ROADMAP.md) and the issue tracker. The boundary is that **this file
starts where working software already exists.**
