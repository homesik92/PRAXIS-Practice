# App Store Roadmap

The path from **working software** to **an approved app on the App Store**, kept
separate from [ROADMAP.md](ROADMAP.md) so release work can be tracked and followed up
without wading through development phases.

**This document is a reusable template, not a one-app plan.** Under **D-41** this
project ships three apps (STEM, Humanities, Administrative), and the sequence below is
meant to be run once per app. Phases A–B are largely one-time identity work shared by
every app; C is once per Apple account; D–K repeat per app.

> **Not legal advice.** Under **D-40** the session owner has deliberately chosen not to
> pursue the attorney consult `LEGAL.md` calls for, which makes `LEGAL.md`'s written
> guidance the *only* guidance rather than a floor beneath a professional opinion. The
> legal items below are therefore recorded as steps to follow, not as advice given.

---

## Per-app status

Update this table as each app moves. Phase letters refer to the sections below.

| App | Subjects | Phase reached | Status | Notes |
| --- | --- | --- | --- | --- |
| **STEM** | 5165, 5436, 5485, 5652 | A | ☐ not started | Ships first (D-41). Nearly the current build already |
| **Humanities** | 5581 + future English/history | — | ☐ not started | 5581's bank is scaffold-only and paused |
| *(Core — 5713/5723/5733)* | *not in scope* | — | ⛔ parked | **Not a data-only addition** — see N-16 and BLUEPRINT.md before scheduling |
| **Administrative** | 5101 + future admin/librarian | — | ☐ not started | 5101 moves here from the current build |

**Ship the STEM app and get it approved before submitting the second** (D-41). If Apple
raises Guideline 4.3(a) against a second, near-identical binary, that is far cheaper to
discover with one app already live than with three in review.

---

## Phase A — Identity: name, mark, and domains

One-time per product name. Gates everything downstream, because the bundle id derives
from the name and **bundle ids are permanent** (Phase D).

- ☐ **A.1 Pick a product name that is not "Praxis [anything]."** Per **D-40**, PRAXIS is
  ETS's live registered mark (Reg. 4,479,538, classes 9/16/35/41/42, renewed 21 May
  2024) and **Class 9 is downloadable practice tests and study guides** — this project's
  exact category. The exam may be named *descriptively* in the subtitle and description;
  it may not be the brand.
- ☐ **A.2 Screen the name on the App Store.** Names must be unique. Apple's public
  search API is the fastest check and needs no account:
  ```
  curl -s "https://itunes.apple.com/search?term=<name>&entity=software&country=us&limit=30"
  ```
  Look for collisions **in the Education category especially** — a same-category prior
  user is the one that matters. *(This screen found "First Bell" already taken by an
  Education app, and "Chalkline" taken by two, before either was committed to.)*
- ☐ **A.3 Run a USPTO clearance search** at <https://www.uspto.gov/trademarks/search>,
  **classes 9 and 41**. Self-service, ~5 minutes. ⚠ An App Store screen is *not* a
  clearance search — it finds app names, not registered marks.
- ☐ **A.4 Secure the domain and social handles.** Cheap, and they go fast once a name is
  public.
- ☐ **A.5 Use ™ from first public use.** Free, no filing, and it establishes a claim.
  **Never use ® before a registration actually issues** — doing so is unlawful. (The ®
  on ETS's site is exactly what proved their mark was real.)
- ☐ **A.6 Decide whether to register federally.** Optional. Roughly $350 per class,
  8–18 months. An **intent-to-use** filing can lock priority before launch. Rights arise
  from use regardless; registration buys nationwide scope and enforcement leverage.

## Phase B — Legal and content posture

Per app, but mostly inherited once established.

- ☐ **B.1 Disclaimer present** in the app and the listing: *"Praxis® is a registered
  trademark of ETS, which does not endorse this product."* The website already carries
  this pattern — match it rather than inventing wording.
- ☐ **B.2 Exam named descriptively only** in name, subtitle, keywords and description.
- ☐ **B.3 Icon and branding carry nothing that could read as ETS-affiliated.**
- ☐ **B.4 No guarantee-style claims** ("pass or your money back", score promises).
- ☐ **B.5 Originals-only content rule re-confirmed.** Every question written from the
  underlying skill, never adapted from ETS's study companions. **No tool can check
  this**, and it is the item that would be genuinely expensive to get wrong.
- ☐ **B.6 Privacy policy published at a public URL.** Required by App Store Connect even
  when an app collects nothing. Say plainly that progress stays on the device.

## Phase C — Apple account setup

Once per Apple Developer account, not per app. **Start early** — verification steps here
take days and are a common cause of a submission-day stall.

- ☐ **C.1 Apple Developer Program membership** active ($99/yr). One account publishes
  unlimited apps — a second account is deliberately *not* being bought (**N-14**).
- ☐ **C.1a Apple Small Business Program enrolled** — 15% commission instead of 30% below
  $1M/year. At D-42's price point this is most of the margin, and enrolment is not
  automatic.
- ☐ **C.2 Account type and seller name confirmed.** Individual accounts display the
  person's legal name publicly; Organization accounts display the legal entity (and need
  a D-U-N-S number). Check what customers will actually see.
- ☐ **C.3 Paid Applications Agreement accepted.** Nothing sells until this is in place.
- ☐ **C.4 Banking and tax forms complete and verified.** The slowest item on this page.
- ☐ **C.5 Certificates, identifiers and provisioning profiles** in order.

## Phase D — App Store Connect record ⚠ irreversible

- ☐ **D.1 Bundle id finalised.** **This is the permanent lock-in moment.** Once a record
  exists the identifier cannot be changed or reused. Derive it from the chosen product
  name, never from "Praxis". *(The current `com.homesik92.PraxisMath` fails on both
  counts — it encodes the superseded Math-only structure and leans on the mark.)*
- ☐ **D.2 App record created** with primary language, category (Education) and name.
- ☐ **D.3 In-app purchase product registered.** Under **D-42** each app is free to
  download with **one** non-consumable unlock (teaching chapters and a short diagnostic
  free; full timed tests and the complete bank paid), indicatively $9.99–$14.99. One
  product per app, not one per subject.
  Product ids are also permanent. Not needed to *develop* the purchase flow — a local
  `.storekit` configuration file exercises purchase, restore and entitlement updates
  with no App Store Connect record at all.

## Phase E — Metadata and assets

- ☐ **E.1 App name** (30 chars) — the brand.
- ☐ **E.2 Subtitle** (30 chars) — where the exam is named descriptively.
- ☐ **E.3 Keywords** (100 chars, hidden). **Only name, subtitle and keywords are indexed
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
- ☐ **E.4 Description**, opening with what the app is and which exam it prepares for.
- ☐ **E.5 Screenshots** at every required device size, for every app.
- ☐ **E.6 App icon**, 1024×1024, no transparency, no rounded corners.
- ☐ **E.7 Age rating** questionnaire completed.
- ☐ **E.8 Privacy nutrition labels** — declare what is collected. If nothing leaves the
  device, say so.
- ☐ **E.9 Support URL** (required) and marketing URL (optional).

## Phase F — Build, sign, upload

- ☐ **F.1 Version and build numbers** set and incrementing.
- ☐ **F.2 Release archive** built and signed.
- ☐ **F.3 Uploaded to App Store Connect** and finished processing.

## Phase G — TestFlight

- ☐ **G.1 Internal testing** — install on a real device, not only a simulator.
- ☐ **G.2 Purchase flow exercised in the sandbox**, including **Restore Purchases**.
- ☐ **G.3 External testers**, if wanted. External builds need their own review pass.

## Phase H — Submit for review

- ☐ **H.1 Export compliance** answered (encryption usage).
- ☐ **H.2 Content rights** declared — this is where third-party material is disclosed.
- ☐ **H.3 Review notes written.** Say plainly that the app is unofficial practice
  material, unaffiliated with ETS, and that the exam is referenced descriptively.
  Reviewers see the trademark before they see the disclaimer.
- ☐ **H.4 Demo account** if any content sits behind a purchase or a login.
- ☐ **H.5 Submitted.**

## Phase I — Review and rejection handling

- ☐ **I.1 Respond to any rejection** in Resolution Center; fix and resubmit.
- ☐ **I.2 Record the rejection reason and the fix in the decision log** — rejections are
  the cheapest available education about Apple's actual posture, and apps two and three
  inherit whatever app one learns.

Reasons worth anticipating here: **4.3(a) spam** (multiple similar apps — the live
question under D-41), **5.2.1 intellectual property** (third-party marks in metadata),
**3.1.1 in-app purchase** (a missing Restore Purchases control is a routine rejection),
and **2.1 completeness**.

## Phase J — Release

- ☐ **J.1 Pricing and availability** set.
- ☐ **J.2 Phased release** decided.
- ☐ **J.3 Released**, and confirmed live on a device that never had a build installed.

## Phase K — Post-launch

- ☐ **K.1 Crash reports and analytics** watched for the first week.
- ☐ **K.2 Reviews monitored** — the first ones set the rating for a long time.
- ☐ **K.3 Content-update path exercised** at least once. ⚠ Saved progress lives in the
  device's web storage, **outside the app bundle, and survives every update**. Changing
  the shape or meaning of stored data can silently destroy a real study history with no
  backup. See `launch-and-cutover.md` in the dev-workflow skill.
- ☐ **K.4 Only then submit the next app** (D-41).

---

## What this document deliberately excludes

Everything up to "the software works": phases, features, question authoring, the
verification gate, and the native shell's own defects all stay in
[ROADMAP.md](ROADMAP.md) and the two issue trackers. The boundary is that **this file
starts where working software already exists.**
