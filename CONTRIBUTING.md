# Contributing

This is a solo project (session owner: Jon / `homesik92`), structured the same way as a
multi-contributor one in case that changes.

## Before your first commit

This repository has no remote today, but it was scaffolded alongside sibling projects
that are public, and the identity is set the same way so that adding a remote later is
never the moment a real email address enters the history:

```
git config user.email "ID+USERNAME@users.noreply.github.com"
git config user.name "USERNAME"
```

Set these **locally, per-repo** (drop `--global`) unless every repository you work in
should use this identity. They are already configured in this checkout.

## How work happens here

See `.claude/skills/dev-workflow/SKILL.md` for the full loop (plan → build → review →
remediate → merge → live-test → close) and its gates. In short: discuss and get an
explicit go-ahead before writing code or docs, work on a branch, keep the decision log
current.

Note the local substitutes documented in `CLAUDE.md` — with no CI and no pull requests,
the local gate is the only gate, and deferred work goes in `BACKLOG.md` rather than an
issue tracker.

## Original questions only

See the top of `CLAUDE.md`. The ETS study companions are a blueprint, never a source of
content. Every practice question is written from scratch. An adapted ETS item is a
derivative work, not an original one — when in doubt, discard and rewrite from the
underlying skill.

## Answer keys get verified, not assumed

A wrong answer key is this project's worst defect class and the only one no automated
check can find. Verify the key independently of drafting the question, and make sure
exactly one option is defensibly correct.
