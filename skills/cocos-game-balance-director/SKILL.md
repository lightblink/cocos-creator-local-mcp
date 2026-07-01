---
name: cocos-game-balance-director
description: Design and tune game balance, economy, progression, difficulty curves, combat numbers, rewards, costs, timers, spawn rates, and Cocos data tables for mini-games. Use when Codex needs to create numeric targets, balancing spreadsheets, level parameters, upgrade systems, scoring rules, or simulation checks for a Cocos Creator game.
---

# Cocos Game Balance Director

## Overview

Use this skill to make game numbers intentional, tunable, and testable. The output should define player-facing balance goals first, then translate them into Cocos-friendly constants, tables, formulas, and playtest checks.

This skill does not guess final production values. It creates an initial tuning model and identifies what playtest evidence should change it.

When the user asks for starting values, always provide concrete v0 tuning assumptions. Label them as defaults to test, not final production truth.

## Core Workflow

1. Define balance intent.
   - State target session length, expected success rate, difficulty feel, reward cadence, and player skill assumptions.
2. Identify tunable systems.
   - Combat, movement, timers, scoring, spawns, upgrades, economy, level pressure, content unlocks, random events, crits, loot, drops, affixes, or procedural selection.
   - Keep first-slice numbers small enough to understand and change quickly.
3. Choose primary metrics.
   - Use metrics such as TTK, time to fail, score per minute, currency per run, upgrade runs required, hit frequency, spawn pressure, and recovery margin.
4. Build formulas and tables.
   - Prefer explicit v0 tables for early prototypes.
   - Use formulas only when the progression shape is more important than individual authored values.
   - For random systems, prefer probability tables, weighted tables, seeded selection rules, expected-value formulas, and variance guardrails over inline probability checks.
   - Include default, minimum, maximum, unit, confidence, and tuning rationale for important values.
5. Add guardrails.
   - Define min/max values, caps, cooldowns, pity rules, streak prevention, spawn budgets, duplicate prevention, and runaway prevention.
6. Hand off implementation.
   - Specify where Cocos should store values: serialized properties, JSON/config files, TypeScript constants, or spreadsheet exports.
   - Call out values that designers should tune without code edits.

## Required Deliverables

For substantial tasks, return:

- Balance goals: target feel and measurable outcomes.
- Tunable list: names, purpose, default value, range, unit, and owner.
- Formula set: only where formulas improve clarity.
- Initial data tables with default, range, unit, owner, and rationale.
- Data schemas when relevant: `RunConfig`, `SpawnCurve`, `PickupConfig`, `UpgradeTable`, `EconomyConfig`, or project-specific equivalents.
- Random tables when relevant: `WeightedTable`, `DropTable`, `CritConfig`, `EventPool`, `AffixPool`, `ProcGenBudget`, or project-specific equivalents, with weights, constraints, and expected outcomes.
- Simulation assumptions: what is modeled and what is not.
- Quick sanity results: expected spawns, reward income, fail pressure, upgrade payback, and edge cases.
- Playtest metrics: observations needed to accept or revise numbers.

## Cocos Data Guidance

- Use serialized `@property` fields for small scene-tuned values.
- Use JSON assets, bundle-loaded configs, resources-loaded configs, or typed TypeScript config modules for larger tables when the project supports them.
- Keep units explicit: seconds, pixels per second, damage per hit, score per second, currency per run.
- Avoid hardcoded magic numbers in gameplay components.
- Avoid scattered `Math.random()` calls in gameplay components. Route random balance through seeded RNG helpers, weighted-table utilities, and tunable config data when outcomes affect combat, rewards, content, or fairness.
- Keep tuning data separate from save data.
- Avoid floating-point equality checks in state transitions.

## Theory Reference

Read `references/balance-foundations.md` when the task involves economy loops, progression curves, combat math, spawn pressure, or difficulty pacing.

## Quality Gates

- Each important number has a design purpose.
- The first playable slice has small, inspectable tuning data.
- Difficulty can increase through authored parameters, not code rewrites.
- Rewards and costs form a closed loop when economy exists.
- Runaway strategies have caps, costs, counters, or diminishing returns.
- Random rewards, crits, spawns, events, and procedural selections have tunable weights, expected values, variance limits, and reproducible test inputs.
- Playtest metrics can prove whether values are too easy, too hard, too slow, or too noisy.

## Output Standard

When completing a balance task, report:

- The intended player experience.
- The proposed numbers, units, ranges, and formulas.
- Probability, weight, seed, pity, and variance assumptions for random systems.
- Cocos implementation/storage recommendations.
- Simulation or sanity checks performed or still needed.
- Playtest metrics and expected adjustment direction.
