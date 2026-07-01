# Playtest QA Foundations

Use this reference when verification needs to distinguish real evidence from optimistic assumptions.

## Evidence Types

Strong evidence:

- reproduced runtime behavior
- screenshots or video
- logs with timestamps and errors
- build output checks
- automated test output
- scene summaries showing components and references
- measured package size or frame rate

Weak evidence:

- code appears correct
- build passed but runtime was not opened
- no error found in a narrow log
- manual setup is assumed
- a feature is described but not wired

## Playtest Questions

Observe whether players:

- understand the first goal
- discover the first input
- connect action to feedback
- notice danger and reward
- understand why they failed
- want to retry
- exploit or ignore intended systems
- become blocked by UI or controls

Do not over-explain during a playtest. Confusion is evidence.

## Severity Guide

- Blocker: cannot launch, cannot play, data loss, crash, missing required scene, broken restart.
- High: core loop works but frequent player-facing failure, severe UX confusion, major balance break.
- Medium: visible bug, tuning issue, unclear feedback, content pacing problem.
- Low: polish issue, cosmetic mismatch, minor copy issue, nonblocking cleanup.

## Smoke Test Minimum

- Launch target scene.
- Confirm player actor exists and accepts input.
- Confirm one reward or score change.
- Confirm one fail or damage condition.
- Confirm restart returns to a clean state.
- Confirm no obvious missing references or console errors.

## Regression Practice

When fixing a defect:

- keep reproduction steps
- identify the smallest failing scenario
- fix the owner system
- rerun the original scenario
- rerun one adjacent scenario
- record what was not retested
