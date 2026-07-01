---
name: cocos-playtest-qa-director
description: Plan and run production-oriented playtest, QA, smoke-test, runtime verification, local Cocos preview checks, WeChat Mini Game build checks, bug triage, and acceptance gates for Cocos Creator projects. Use when Codex needs to verify whether a Cocos mini-game is playable, fun, comprehensible, stable, performant, and ready for local runtime testing.
---

# Cocos Playtest QA Director

## Overview

Use this skill to convert "it builds" into evidence that a Cocos mini-game works for players. The output should define what to test, how to observe it, what evidence proves success, and what defects block progress.

This skill coordinates with Cocos local build, scene assembly, gameplay architecture, game design, interaction UX, balance, and art direction.

## Core Workflow

1. Define the verification target.
   - Identify whether the task is smoke test, design playtest, balance pass, UX pass, regression, local WeChat build, or release-candidate check.
2. Create test scenarios.
   - Cover launch, first action, scoring/reward, fail, win, pause, restart, scene reload, and any platform-specific path.
3. Gather evidence.
   - Prefer command output, build logs, screenshots, runtime logs, Cocos editor bridge summaries, WeChat DevTools logs, and reproduced steps.
   - For phone-first games, capture or inspect at least one target-runtime viewport screenshot and check playfield scale, HUD readability, control size, safe-area placement, and cropping/letterboxing before calling the slice playable.
   - For from-zero playable slices, record whether first-loop visuals, UI, SFX, and music are generated/imported, deliberately placeholder-only, or missing. Do not let geometry-only visuals pass as production-ready without an explicit waiver.
   - For generated assets, include asset-review evidence for role fit, orientation, alpha/silhouette quality, mobile readability, collision fit, and whether required sequence animations are present.
4. Triage findings.
   - Classify blockers, high-risk bugs, design issues, polish issues, and deferred risks.
   - Separate player-facing defects from developer cleanup.
5. Decide next action.
   - Recommend fix, retest, cut scope, tune numbers, revise UX, regenerate assets, or accept risk.
6. Record acceptance.
   - State exactly which gates passed, failed, or were not run.

## Test Plan Format

For substantial tasks, return:

- Target: smoke, UX, balance, design, runtime, build, or regression.
- Build/context: project root, scene, platform, config, and version if known.
- Scenarios: step, expected result, evidence, pass/fail.
- Defects: severity, reproduction, expected, actual, suspected owner.
- Metrics: frame rate, package size, load time, session length, success rate, or subjective playtest notes.
- Decision: ship locally, fix now, cut, retest, or defer.

## Local Cocos And WeChat Checks

- Use `cocos-wechat-local-build` when preparing or inspecting local `wechatgame` output.
- Use `cocos-scene-prefab-assembly` when scene wiring or serialized references may be missing.
- Use `cocos-creator-gameplay-architecture` when a defect points to scripts, lifecycle, pooling, input, or state.
- Treat build success as necessary but not sufficient.
- Do not claim WeChat runtime success without opening or otherwise verifying the built output in the intended local runtime.

## Vertical Slice Evidence Gate

Do not call a vertical slice verified unless the evidence bundle proves:

- runtime used: Cocos Preview, browser preview, WeChat DevTools, or another explicit local runtime
- launch evidence: scene or package opened and reached the intended start state
- first input evidence: primary control works in the runtime used
- core loop evidence: reward/score/progress changes after player action
- failure or win evidence: at least one terminal or damage/result state works
- restart evidence: restart returns to a clean playable state
- log evidence: console/build/runtime errors reviewed and summarized
- visual evidence: screenshot, video, scene summary, or equivalent artifact path when available
- visual readability evidence: target viewport shows the primary playfield, HUD, and controls at intentional readable size with no accidental shrink, crop, or overlap
- asset/audio evidence: first-loop sprites/UI/SFX/music are present, intentionally deferred, or marked as missing with owner and next action
- animation evidence: required sprite sheets, Cocos animation clips, or frame-sequence effects are present and visible in runtime, or explicitly marked as missing with owner and next action
- asset semantic evidence: directional sprites face the correct gameplay direction and generated assets match their design roles at runtime scale
- unrun checks: any missing runtime, platform, or manual checks are explicitly marked unrun

If only the Cocos build or WeChat package output was inspected, report "local build verified; runtime not run" and do not call the slice verified.

## Theory Reference

Read `references/playtest-qa-foundations.md` when the task involves designing playtests, interpreting player behavior, triaging defects, or deciding whether evidence is strong enough.

## Quality Gates

- The game launches into the intended scene.
- The first player action works.
- Core loop can succeed, fail, and restart.
- UI state transitions are visible and correct.
- Target-runtime screenshot or equivalent visual evidence passes readability, tap-target, safe-area, and scale checks.
- First-loop visual and audio asset decisions are explicit; geometry-only placeholders are accepted only for logic-only prototypes or early greybox tests.
- Gameplay-critical generated assets pass role, orientation, alpha, silhouette, animation, and collision-fit review before production-ready acceptance.
- Required first-loop animations are visible in runtime or explicitly fail the vertical-slice gate.
- No required serialized reference is missing.
- Build output contains required WeChat Mini Game files when that platform is targeted.
- Player-facing issues are triaged before polish-only issues.
- Unrun checks are reported as unrun.

## Output Standard

When completing a QA task, report:

- Tests performed and evidence gathered.
- Pass/fail status by gate.
- Defects with severity and reproduction steps.
- Recommendations and retest order.
- Remaining risks or skipped checks.
