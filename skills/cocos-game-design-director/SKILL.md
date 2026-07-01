---
name: cocos-game-design-director
description: Direct production-quality game design for Cocos Creator and WeChat Mini Game projects. Use when Codex needs to turn a game idea into a playable concept, define a core loop, scope an MVP or vertical slice, critique mechanics, write a design brief, choose player goals and rewards, or align gameplay implementation with player experience before building.
---

# Cocos Game Design Director

## Overview

Use this skill to make game design decisions before implementation hardens around weak assumptions. The output should turn intent into a small, testable Cocos mini-game design with clear player actions, feedback, constraints, and acceptance criteria.

This is a director skill. It does not replace Cocos implementation, asset generation, balance, UX, or QA skills; it decides what they should build toward.

## Core Workflow

1. Identify the promise.
   - State the one-sentence fantasy, the target player, the intended session length, and the platform context.
   - For WeChat Mini Games, assume touch-first play, low patience, fast loading, and short sessions unless the project proves otherwise.
2. Define the core loop.
   - Specify player input, system response, short-term goal, reward, escalation, and reset.
   - Keep the first playable loop smaller than the imagined full game.
3. Choose the skill test.
   - Define what the player must learn, decide, execute, or optimize.
   - Reject mechanics that only add content without adding meaningful decisions or satisfying execution.
4. Scope the vertical slice.
   - List required mechanics, UI states, assets, audio cues, data tables, and scene nodes.
   - Mark each item as required for first play, required for the slice, or deferred.
   - When the design uses randomness, define its player-facing purpose: surprise, replay variety, tension, build diversity, recovery, risk/reward, or content freshness. Do not add randomness only to hide thin content.
   - Identify which random outcomes must be controlled by rules, tables, weights, seeds, pity, or caps so the player experience remains readable and fair.
5. Define feedback and failure.
   - For every player action, define immediate feedback, delayed consequence, and failure readability.
   - Failure should teach a next action rather than feel arbitrary.
6. Produce implementation-facing design.
   - Hand off concrete systems to `cocos-creator-gameplay-architecture`.
   - Hand off touch flow to `cocos-interaction-ux-director`.
   - Hand off art bible needs to `cocos-art-direction-director`.
   - Hand off numbers to `cocos-game-balance-director`.
   - Hand off verification to `cocos-playtest-qa-director`.

## Multi-Skill Orchestration

When the user asks for a full Cocos mini-game design rather than one design slice:

1. Run this skill first to define promise, loop, MVP, and non-goals.
2. Use `cocos-interaction-ux-director` to define touch controls, UI states, and feedback.
3. Use `cocos-level-content-design` to define the first content unit, level grammar, and wave or mission data.
4. Use `cocos-art-direction-director` only after the loop and content needs are known.
5. Use `cocos-game-balance-director` to turn mechanics and content into v0 tunable values.
6. Synthesize one implementation-facing brief. Resolve conflicts by prioritizing player comprehension, first playable scope, then production scalability.

## Design Brief Format

Return a compact design brief for substantial tasks:

- Game promise: one sentence.
- Assumptions: player, session, platform, input, and production target.
- Non-goals: features intentionally excluded from the first slice.
- Target context: platform, session length, player mode, input style.
- Core loop: action, feedback, reward, escalation, reset.
- Control model: primary touch action, fallback input, and failure/restart controls.
- Content unit: level, wave, room, mission, puzzle, or run segment.
- Player decisions: the meaningful choices or execution challenges.
- MVP mechanics: the smallest playable set.
- Vertical slice: first complete local-play target.
- Cocos scene graph sketch: main roots, managers, actor roots, UI roots, and pools.
- Data contracts: required config tables, save data, generated assets, and scene references.
- Randomness contract: random systems, intended experience, player-facing information, fairness constraints, seed/replay needs, and handoff owner.
- Required states: boot, menu if needed, play, pause, win, lose, restart.
- Required assets: only what the slice truly needs.
- Risks: unclear fun, over-scope, weak feedback, hard-to-tune systems.
- Slice acceptance criteria: measurable player-visible criteria for local play.

## Scope Rules

- Prefer one strong loop over several underdeveloped systems.
- Cut features that do not change player decisions, emotion, mastery, or clarity.
- Keep meta progression out of the first slice unless it is the game.
- Use placeholders for art until the loop proves it needs production art.
- Prefer deterministic prototypes before procedural breadth; when random systems are core to the design, make them seeded, table-driven, and testable rather than scattered ad hoc random calls.
- Treat local WeChat runtime constraints as part of the design, not late porting work.

## Theory Reference

Read `references/game-design-foundations.md` when the task involves genre selection, mechanic critique, motivational design, retention concerns, or a design argument that needs more than a brief workflow.

## Quality Gates

Before calling a design ready for implementation, verify:

- The player can understand the first goal within the opening seconds.
- The core loop can be implemented as a small Cocos scene.
- Every required mechanic has a visible feedback path.
- Failure and success are readable without developer explanation.
- The MVP can be tested locally without production platform services.
- Randomness has a design purpose, fairness boundary, and tuning owner when it affects rewards, failure, combat, map layout, events, or progression.
- The scope fits a first vertical slice rather than a full production backlog.

## Output Standard

When completing a design task, report:

- The design brief or critique.
- The chosen core loop and why it fits Cocos/WeChat.
- What to implement now, defer, or cut.
- Cross-skill handoffs and exact artifacts needed next.
- Playtest questions that would prove or falsify the design.
