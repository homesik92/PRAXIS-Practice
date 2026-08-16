# Decision Index

Maps each subsystem/topic to its currently-authoritative decision chain in
`DECISIONS.md`. Update this in the same change as any log append. Consult this first;
read the full log only when a topic isn't indexed yet.

| Topic | Governing decisions |
| --- | --- |
| Repo/process setup | D-1 |
| Remote, hosting target, deployment | D-2 |
| Methodology gaps caused by having no remote | D-2 → **N-1** |
| Tech stack, build step, dependencies | D-3 |
| Test coverage & bank extensibility | D-4 → **N-3** (confirmed, 411 questions) |
| Question provenance & ETS copyright | D-5 |
| v1 feature set | D-6, **D-8** (spaced repetition) |
| Saved-progress store (schema-change hazard) | D-6, **D-8** |
| Design-stage shape & scope | **D-7** |
| Screen flow & answer format | **D-9** |
| Question format fork (single- vs multi-select) | D-9 — **open**, see BLUEPRINT.md |
| Test blueprints (weightings, timings) | BLUEPRINT.md (not a decision — extracted fact) |
| Prior 185-question Mathematics set | N-2 |
