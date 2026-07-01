---
name: cocos-game-reference-research-director
description: Research and deconstruct reference games, genre expectations, player promises, mechanics, content patterns, monetization-adjacent systems, art/audio cues, UX conventions, and IP-safe design pillars before planning or implementing Cocos Creator and WeChat Mini Game projects. Use when the user describes a game by reference title, genre shorthand, competitor, "like X", "雷霆战机", "飞机大战", "塔防", "肉鸽", "合成", or any vague game idea that needs research-backed interpretation before game design, balance, art direction, architecture, level content, or implementation.
---

# Cocos Game Reference Research Director

## Overview

Use this skill before game design when the user's request depends on a reference game, genre shorthand, market pattern, or unstated player expectation. The output should translate "make something like X" into IP-safe design pillars, genre conventions, first-slice scope, and handoffs to the Cocos production skills.

This is a research and interpretation skill, not a cloning skill. It should preserve the useful design intent of references while avoiding direct reproduction of protected names, art, characters, exact systems, maps, UI, music, copy, or proprietary progression.

## Research Decision

- Browse when the user names a specific modern game, asks for latest/current examples, refers to a version/update/store page, wants competitor comparison, or when your knowledge could be stale.
- Use stable genre knowledge without browsing when the request is broad, low-stakes, and the genre conventions are enough to move into design.
- If browsing, prefer primary or close-to-primary sources: official store pages, publisher pages, gameplay videos, manuals, patch notes, reputable wiki/reference pages, and observed screenshots/videos. Attribute links in the final answer.
- Separate observation from inference. State what the source says or shows, then what you infer for the Cocos project.
- Do not over-research before a small prototype. Gather enough to define the promise, core loop, scope, risks, and next skill handoffs.

Read `references/research-foundations.md` when the task involves a named reference game, multiple competitors, genre taxonomy, IP-risk judgment, or a design argument that needs more than a compact brief.

## Core Workflow

1. Parse the reference intent.
   - Identify named games, genre labels, platform assumptions, player fantasy, and likely unstated expectations.
   - Detect whether the user wants inspiration, a clone, a parody, a faithful genre exercise, or a production-feasible vertical slice.
2. Gather reference evidence.
   - Use live research when needed.
   - Capture 3-7 high-signal observations rather than exhaustive notes.
   - Include mechanics, controls, session rhythm, progression, content format, audiovisual promise, and player skill test.
3. Deconstruct genre pillars.
   - Define what the player does every second, every minute, and across a session.
   - Identify what creates tension, mastery, rewards, failure, and replay value.
   - Separate must-have genre signals from optional depth systems.
4. Define IP-safe design pillars.
   - Preserve abstract patterns and player expectations.
   - Avoid copying names, silhouettes, characters, UI layout, exact skill trees, exact equipment sets, exact level sequences, audio motifs, or copywriting.
   - Rename and reshape the project around a distinct fantasy, visual direction, and system expression.
5. Scope the first Cocos slice.
   - Propose the smallest local-play target that tests the reference promise.
   - List required mechanics, content, assets, audio, UI, data, and architecture pressure points.
   - Mark what to implement now, fake, defer, or research later.
6. Hand off to production skills.
   - `cocos-game-design-director`: design brief and core loop.
   - `cocos-interaction-ux-director`: touch controls, HUD, feedback, onboarding.
   - `cocos-level-content-design`: waves, levels, encounters, pacing.
   - `cocos-game-balance-director`: v0 values, curves, spawn pressure, rewards.
   - `cocos-art-direction-director`: distinct art bible and asset family needs.
   - `cocos-asset-pipeline-director`: sprite, UI, VFX, SFX, and music pack.
   - `cocos-creator-gameplay-architecture`: system boundaries and implementation plan.
   - `cocos-playtest-qa-director`: evidence gates and risks.

## Research Brief Format

For substantial tasks, return:

- Reference intent: what the user probably means by the named game or genre.
- Source basis: links or "genre knowledge only" with confidence.
- Key observations: concise facts from references.
- Design inferences: what those observations imply for this project.
- Genre pillars: controls, loop, content, progression, feedback, failure, replay.
- IP-safe translation: what to keep abstractly, what to avoid copying, and a distinct project angle.
- First playable slice: smallest local Cocos target that proves the promise.
- Required systems: gameplay, content, data, assets, audio, UX, architecture, QA.
- Risks and unknowns: fun risk, scope risk, legal/IP risk, implementation risk, tuning risk.
- Handoffs: exact next artifacts each downstream skill should produce.

## Genre Shortcut Handling

When a shorthand phrase appears, expand it into design questions before building:

- "雷霆战机 / 飞机大战 / 竖屏打飞机": vertical scrolling shooter, one-finger movement, auto-fire, enemy waves, pickups, dense feedback, boss patterns, hitbox readability, upgrade or power curve, electronic/arcade audio energy.
- "塔防": path pressure, tower placement, target selection, damage types, enemy traits, waves, economy, upgrades, build slots, readability under crowding.
- "肉鸽": run structure, randomized choices, build synergies, escalating risk, readable failure, restart cadence, meta progression boundary.
- "合成": board economy, merge rules, spawn cadence, inventory pressure, goal clarity, soft fail states, collection/progression.
- "弹幕": bullet pattern readability, escape gaps, warning/telegraph, player hitbox, fairness constraints, performance budgets.

These shortcuts are starting points. Adjust them to the user's actual platform, audience, production target, and taste.

## Quality Gates

- The reference has been interpreted as design intent, not copied as IP.
- The brief distinguishes source observation from design inference.
- The first slice is small enough for local Cocos implementation and playtest.
- Required downstream skills have concrete handoff inputs.
- Unknowns are marked instead of guessed as facts.
- The output leaves room for creative variation and does not over-prescribe mechanics that the reference does not require.

## Output Standard

When completing a reference research task, report:

- Research basis and source links when browsing was used.
- IP-safe design pillars and avoided-copying notes.
- First-slice recommendation and non-goals.
- Cross-skill handoff checklist.
- Open questions only when they materially change the slice.
