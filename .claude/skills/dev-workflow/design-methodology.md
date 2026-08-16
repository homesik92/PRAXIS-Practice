# Design-Stage Methodology (new projects)

How a project gets from idea to a coding plan. This is the front half of the lifecycle; SKILL.md covers the per-session coding loop that follows.

## 1. Ideation (the project owner's stage)

The project owner comes up with the idea and fleshes it out — free-flowing notes, slowly fitted into an overarching outline. Claude may assist informally, but there is no process here to enforce. Ideation ends when the notes fit an outline.

## 2. The seed document

The project owner writes a **seed document**: a merging and distillation of the ideation notes. It states the project motivation and goals, and may go deep on selected aspects of requirements or engineering design. The seed is the design stage's single input.

## 3. Design planning

In a single session on the strongest available model at extra-high or max effort, Claude:

1. Reviews the seed document and asks clarifying questions — surfacing the key early decisions that will drive everything downstream.
2. Proposes a **design plan**: the set of documents to produce and a series of design sessions to produce them, each session scoped to manage focus and context (sessions may split into sub-sessions mid-flight if scope demands it).
3. Recommends model and effort per session (design work is typically strongest-model at high/extra-high/max).

Typical deliverables of the design stage:

- Product Requirements Document (PRD)
- Engineering Design
- Data Schema
- API Spec
- **Decision log (DECISIONS.md / ADR)** — started on day one, append-only, records every significant decision with its reasoning; genuine forks are decided by the session owner and recorded as "Session owner's call" — by role, never by name.

Which of these a given project needs is a judgement, not a checklist. A project with no server and no network calls has no API spec to write, and saying so beats producing an empty one.

## 4. Execute the design plan

Run the design sessions in order, each building on the previous. Discuss-first applies throughout: Claude proposes, the session owner reacts, decisions get logged. Every session ends by committing the updated docs.

## 5. Adversarial design review

When the design docs are complete, run them through **fresh sessions of the strongest model at max effort with no prior context on the project** — the reviewer must not share the designers' assumptions. Review from multiple independent angles (e.g., security/privacy, operations/cost, data integrity, UX/accessibility), each as its own review pass.

Reviewer hygiene: hand each reviewer the artifact and the contract it must satisfy — never the designers' reasoning or conclusions, because a reviewer given conclusions returns validation of those conclusions. Bound the back-and-forth on any single finding at three cycles; non-convergence after three is information about the artifact (usually: it's too big — decompose it), not a reason to keep looping. And watch for **doubt theater**: if a review pass surfaces substantive findings and triage classifies none of them as actionable, the process is validating rather than reviewing — stop and say so plainly to the session owner.

Then, back in a context-bearing session:

1. **Consolidate** all review findings into a single composite.
2. **Triage** every finding (accept / reject / defer, with reasoning) — the session owner dispositions the contentious ones.
3. Build a **remediation plan**, structured like the design plan (multiple sessions scoped by focus and context).
4. Execute remediation, propagating each accepted change once into every affected doc, and record the dispositions in the decision log.

## 6. Visual design

For projects with a UI: run a visual-design pass (Claude Design) driven by a written brief, delivering tokens, component specs, and reference prototypes. Reconcile any naming drift back to the schema — the data docs stay authoritative for field names and semantics.

## 7. The coding plan

Break implementation into phases using a **walking-skeleton approach** — an end-to-end thread first, then flesh. An *example* shape (not a template):

- Phase 0 — tools and infrastructure (repo, gate scripts, test harness)
- Phase 1 — walking skeleton (one thin end-to-end path, running)
- Phase 2 — core functions (data model, persistence)
- Phases 3–n — major modules/pages
- Phase n+1 — hardening
- Phase n+2 — launch (cutover)

Break phases into sub-phases by focus and complexity, and size individual tasks for agent performance: small-to-medium units touching at most ~5 files, acceptance criteria that fit in three bullets, each task leaving the system green. An "and" in a task title usually means it's two tasks. **Every phase ends live-tested** by the session owner — on a staging environment where one exists, or on a locally-served copy where it doesn't.

The verification gate is established in Phase 0 whether or not CI exists to run it. On a project with no CI (see SKILL.md's local-substitute note), Phase 0 delivers the local gate script instead, and it becomes the authoritative check rather than a preview of one.

The launch phase (cutover) has its own methodology: see `launch-and-cutover.md` in this skill.

Between planned phases, schedule interim **batch sessions** as findings accumulate: triage the backlog, group entries by code locality into small batches, and clear them batch-per-session with the normal coding loop.
