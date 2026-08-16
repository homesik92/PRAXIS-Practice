# Contributing

This is currently a solo project (session owner: Jon / `homesik92`), structured the
same way as a multi-contributor one in case that changes.

## Before your first commit

This repository is public. Set a GitHub `noreply` address so a real email address
never lands in public history (force-push is not assumed to be available, so a
committed real address stays committed):

```
git config user.email "ID+USERNAME@users.noreply.github.com"
git config user.name "USERNAME"
```

Your numeric ID and username: `gh api user --jq '{id, login}'` (if `gh` is
authenticated), or GitHub → Settings → Emails → "Keep my email addresses private".

Set these **locally, per-repo** (drop `--global`) unless every repository you work in
should use this identity. They are already configured in this checkout.

## How work happens here

See `.claude/skills/dev-workflow/SKILL.md` for the full loop (plan → build → review →
remediate → merge → live-test → close) and its gates. In short: discuss and get an
explicit go-ahead before writing code or docs, work on a branch, land through a PR,
keep the decision log current.

## Original questions only

See the top of `CLAUDE.md`. The ETS study companions are a blueprint, never a source of
content. Every practice question is written from scratch. An adapted ETS item is a
derivative work, not an original one — when in doubt, discard and rewrite from the
underlying skill.

## Answer keys get verified, not assumed

A wrong answer key is this project's worst defect class and the only one no automated
check can find. Verify the key independently of drafting the question, and make sure
exactly one option is defensibly correct.
