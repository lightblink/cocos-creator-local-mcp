---
name: cocos-level-content-design
description: Design levels, waves, missions, content pacing, mechanic introduction, encounter composition, procedural rules, and reusable content modules for Cocos Creator games. Use when Codex needs to plan or critique level progression, stage data, enemy waves, puzzle sequences, tutorial levels, content variety, or local-play vertical slice content for a Cocos or WeChat Mini Game project.
---

# Cocos Level Content Design

## Overview

Use this skill to turn mechanics into paced, testable content. The output should define how levels teach, vary, combine, and pressure the player without relying on random content volume.

This skill coordinates with game design, balance, scene assembly, and QA.

## Core Workflow

1. Identify the content unit.
   - Choose the level, wave, room, puzzle, mission, run segment, or encounter as the smallest authored unit.
2. Define level grammar.
   - List verbs, hazards, enemies, pickups, spaces, timers, objectives, and constraints.
   - Define which combinations are legal, teachable, and readable.
   - For procedural or randomized content, define the grammar before generation: allowed modules, banned combinations, spacing rules, difficulty budget, pacing beats, and fairness constraints.
3. Sequence learning.
   - Introduce one new idea at a time.
   - Provide a safe read, a basic use, a pressured use, and a combination use when possible.
4. Pace intensity.
   - Alternate learning, mastery, pressure, reward, and rest.
   - Control density, speed, timer pressure, enemy mix, and resource scarcity.
5. Build reusable data.
   - Represent levels as tables, JSON, prefabs, blueprints, or scene variants that Cocos can consume.
   - Use procedural rules, seedable generators, weighted pools, and validation passes when variation is required. Do not replace content design with unconstrained random placement.
6. Define acceptance tests.
   - State what the player should understand, feel, and accomplish in each content unit.

## Content Deliverables

For substantial tasks, return:

- Content unit definition.
- Level grammar: verbs, objects, hazards, goals, constraints.
- Progression outline: introduction, variation, combination, mastery.
- Level table: id, goal, new idea, pressure, reward, difficulty, assets, data.
- Arcade wave table when relevant: `timeStart`, `duration`, `spawnLane` or `xRange`, `fallSpeed`, `spawnInterval`, `hazardType`, `pickupType`, `telegraphMs`, `maxSimultaneous`, and `fairnessRule`.
- Encounter or wave spec: spawn order, timing, composition, and escalation.
- Procedural spec when relevant: seed policy, module pool, weighted picks, generation steps, validation rules, failover/fallback content, and difficulty budget.
- Fairness constraints: minimum escape gap, warning time, overlap rules, pickup-after-risk timing, and rest beats.
- Cocos data handoff: scene/prefab/table format and required components.
- Playtest questions: comprehension, difficulty, pacing, and replay value.

## Cocos Implementation Guidance

- Keep authored content data separate from generic gameplay systems.
- Use prefabs for repeated actors and hazards.
- Use JSON or TypeScript data tables for waves, missions, and progression when appropriate.
- Keep random content data separate from random generation algorithms: pools, weights, constraints, and budgets should be tunable without rewriting generator code.
- Use scene variants only when spatial authoring matters.
- Use generated blueprints only when they can be inspected and saved reliably.
- Keep first local slice content small enough to fully playtest.

## Theory Reference

Read `references/level-content-foundations.md` when the task involves teaching mechanics, pacing difficulty, designing waves, authoring level tables, or deciding between procedural and authored content.

## Quality Gates

- Each content unit has a purpose beyond filling time.
- New mechanics are introduced before they are combined under pressure.
- Failure causes are readable in context.
- Difficulty rises through controlled variables.
- Procedural or random content is seedable, constrained by authored grammar, and validated against fairness/readability rules.
- Data can be tuned without rewriting core code.
- The first slice includes enough content to test the loop, not the full game.

## Output Standard

When completing a level/content task, report:

- Level grammar and progression.
- Concrete level, wave, or mission specs.
- Procedural generation rules, seeds, tables, and validation checks when content is randomized.
- Cocos data format and wiring needs.
- Balance assumptions and QA checks.
- Deferred content and why it is deferred.
