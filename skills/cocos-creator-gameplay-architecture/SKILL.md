---
name: cocos-creator-gameplay-architecture
description: Implement and review Cocos Creator 3.8 gameplay architecture, TypeScript components, UI systems, scene wiring, prefabs, resource loading, input, audio, tweening, collision, object pooling, state machines, and maintainable runtime code. Use whenever the user asks Codex to build gameplay, create a Cocos prototype, modify Cocos scripts, wire UI/game systems, or prepare a Cocos project for local playtesting.
---

# Cocos Creator Gameplay Architecture

## Overview

Use this skill to build Cocos Creator gameplay that can actually be wired into scenes and prefabs. Treat TypeScript code, component properties, node hierarchy, assets, and runtime lifecycle as one system.

Target Cocos Creator 3.8 unless the project proves another version. Prefer project-local conventions over generic patterns.

## Core Workflow

1. Inspect the project before editing.
   - Check `assets/`, `settings/`, `tsconfig.json`, existing scripts, scenes, prefabs, and naming conventions.
   - Identify whether the task needs code only, scene/prefab wiring, assets, or build changes.
   - If there is no project yet and Cocos local MCP tools are available, use `cocos_local_create_project` with the `empty-2d` template as the default start for a 2D mini-game; it should also create `assets/scenes/Main.scene`.
2. Design the runtime flow.
   - Identify game states, UI states, input sources, resource ownership, and reset/restart behavior.
   - Classify complexity before coding: greybox, small vertical slice, or production-oriented slice. Combat, waves, economy, progression, upgrades, affixes, inventory, multiple actor types, and data tables are signals to consider explicit system boundaries.
   - For small or production-oriented slices, sketch a system boundary plan before implementation: candidate domain systems, data/config modules, scene-facing adapters, event flow, ownership, and cross-system dependencies. Keep the plan proportional to the slice.
   - Define a layout contract before implementation: target runtime, target device class, orientation, design resolution, fit policy, safe-area behavior, and the screen regions owned by gameplay and HUD.
   - Define an asset policy for the slice: generated/staged assets through `cocos-asset-pipeline-director`, existing project assets, or deliberate engine-geometry placeholders. For from-zero mini-games, prefer a minimal generated placeholder pack when the asset MCP is available.
   - For generated gameplay assets, require an asset review handoff before wiring: role, orientation, alpha/silhouette quality, mobile readability, animation readiness, and collision fit. Use `cocos-asset-review-director` when available.
   - For games where motion carries readability or feel, define an animation/VFX contract before implementation: which actors need sprite sheets, state frames, one-shot effects, loops, and Cocos `AnimationClip` or frame-sequence playback.
   - Keep a small vertical slice playable before adding breadth.
   - For a new mini-game prototype, use `cocos_local_create_minigame_skeleton` when available to create a baseline GameManager, HUD, input, player controller, pool manager, and starter scene blueprint.
   - For non-trivial games, consider `cocos_local_create_architecture_skeleton` when available before feature scripts. Use its preset as a starting point to prune, merge, or rename systems according to the actual design, then create thin Cocos Components that host or adapt the chosen systems.
3. Implement Cocos components.
   - Use `@ccclass`, `@property`, and `Component` lifecycle correctly.
   - Expose scene-tunable values with typed `@property` fields instead of magic constants.
   - If available, use `cocos_local_create_component_script` to create new TypeScript component files with valid Cocos Creator 3.8 structure.
4. Wire scene dependencies deliberately.
   - Prefer explicit serialized references for authored scene nodes.
   - Use lookup helpers sparingly and fail loudly when required nodes are missing.
   - For generated starter projects, open or reuse the project with `cocos_local_open_project`, wait with `cocos_local_wait_for_editor_bridge`, then apply the starter blueprint with `cocos_local_apply_scene_blueprint` after a scene is active.
   - When switching between local Cocos projects, treat already-open Creator windows and bridge ports as shared environment state. Reuse an existing editor for the same project; close unrelated project windows or use distinct bridge ports when routing could become ambiguous.
5. Verify in runtime context.
   - Run typecheck/build when available.
   - Confirm scene entry, input, state transitions, UI updates, and restart paths.

## Component Rules

- Use `import { _decorator, Component, Node } from 'cc';` and destructure `ccclass` / `property`.
- Declare a stable class name with `@ccclass('ClassName')`; this is the name to use when attaching custom components through editor automation.
- Keep one responsibility per component: player control, enemy behavior, spawner, game state, HUD, audio, etc.
- Put cross-system orchestration in a manager component attached to a stable scene node.
- Avoid global singleton sprawl. Use singletons only for truly process-wide services and reset them for scene reloads.
- Avoid doing expensive work in `update(dt)` when an event, scheduler, tween callback, or state transition is sufficient.
- Use `dt` for frame-rate independent movement and timers.
- Unsubscribe events in `onDisable` or `onDestroy`.
- Guard serialized references before use and report actionable errors.
- Avoid letting one large Cocos Component own unrelated domains such as game rules, input, UI, spawning, economy, combat, asset loading, and audio. A compact manager is acceptable when the slice is small, but it should have clear boundaries and an easy path to extraction.

## System Architecture Rules

- Prefer Cocos `Component` classes as scene adapters: they own node references, lifecycle hooks, and serialized properties, then delegate durable game rules to systems when the behavior is likely to grow.
- Let systems own coherent domain behavior: combat, damage, targeting, movement, waves, economy, scoring, progression, input normalization, UI coordination, asset loading, or audio routing. Merge small systems when separation would add ceremony without reducing complexity.
- Let data/config modules own tunable values, formulas, tables, tags, and IDs once values need tuning or reuse. Early constants are acceptable when they are few, named, and easy to move.
- Use an event bus, command queue, or explicit method boundary for cross-system communication. Avoid circular imports and direct mutation across unrelated systems.
- Keep system update order explicit when multiple systems run per frame.
- Use object pools for frequent runtime objects and keep spawn/despawn ownership clear.
- Add an explicit animation or VFX layer when the slice uses animated sprites, repeated effects, hit reactions, explosions, rewards, warning markers, or UI state transitions. A small `AnimationSystem`, `VfxSystem`, `SpriteSequencePlayer`, or effect catalog is preferred over burying frame playback inside unrelated combat or spawner code.
- For tower defense, consider domains such as `DamageSystem`, `TargetingSystem`, modifier or affix handling, status effects, towers, enemies, waves, economy, levels, assets, audio, UI, and balance/config tables. Use the actual feature set to decide which boundaries deserve files now.
- For roguelike, RPG, shooter, idle, merge, puzzle, or card games, identify equivalent genre-specific pressure points before implementation instead of defaulting to one manager file by habit.
- Single-file gameplay is acceptable for a greybox, tiny mechanic proof, or very small vertical slice. If using it, name the tradeoff and the first seams to extract if scope grows.

## Scene And Prefab Wiring

- Keep scene root organization readable: `Canvas`, `GameRoot`, `UIRoot`, `Managers`, `Pools`, `Audio`.
- Prefer prefabs for repeated gameplay objects and UI items.
- Keep prefab public API small: initialize with data through a method after instantiate.
- For pooled objects, implement explicit `spawn` / `despawn` or `reset` methods.
- Do not claim a feature is complete until the component is attached or the remaining editor wiring is listed precisely.

## Resource Loading

- Prefer serialized asset references for always-present scene assets.
- Use `resources` only for intentionally runtime-loaded assets.
- Use Asset Bundles for level-specific, optional, cosmetic, or late-loaded content.
- Release dynamically loaded assets when ownership ends.
- Avoid hardcoding fragile paths unless the project already uses path-based loading.
- Do not silently replace the asset pipeline with colored nodes or generated geometry. If geometry-only placeholders are used, state why they are acceptable for this slice and list the sprite, UI, SFX, or music classes still pending.
- Do not treat static sprites as a substitute for required feedback animation. If sequence assets are unavailable, mark the missing animation and keep the playback system ready to receive sprite sheets or `AnimationClip`s.

## UI And Input

- Use Cocos UI components for authored UI: `Button`, `Label`, `ProgressBar`, `Layout`, `Widget`, `UIOpacity`.
- Separate UI rendering from game state mutation. The HUD observes state or receives update calls; it should not own game rules.
- Support touch-first input for WeChat Mini Game targets.
- Keep keyboard shortcuts as development conveniences, not the only control path.
- Make restart, pause/resume, win, lose, and loading states explicit.
- Do not hardcode a desktop canvas, fixed viewport, or one-off pixel layout for phone mini-games. Use the declared design resolution, anchors, `Widget`, `Layout`, proportional regions, or a small layout controller so the primary playfield and HUD adapt across target aspect ratios.
- Before coding visual sizes, decide whether a value is design-space, content-space, or screen-relative. Expose important layout and spacing values as serialized properties instead of burying them in magic constants.

## Performance Guardrails

- Pool frequently spawned objects such as bullets, pickups, enemies, and hit effects.
- Avoid repeated instantiate/destroy during intense gameplay.
- Avoid per-frame allocation in hot loops.
- Cache component references after validation.
- Keep node counts, particle counts, frame counts, and texture sizes proportional to mobile/web targets.
- Prefer event-driven UI updates over polling labels every frame.

## WeChat Mini Game Awareness

- Do not assume browser DOM APIs exist.
- Avoid dependencies that require Node.js, DOM, Web Workers, or browser-only APIs unless the build target proves support.
- Keep first-playable assets and scripts small; design optional content for bundles.
- Treat share, login, ads, ranking, and platform APIs as adapters behind a small interface so local gameplay remains testable.
- Treat missing orientation/design-resolution/adaptation decisions as an architecture gap for new phone-first games, not as a later polish item.
- Treat missing first-loop asset and audio decisions as a production-readiness gap for from-zero games, even when the gameplay logic builds and runs.

## Output Standard

When completing a gameplay task, report:

- Scripts changed or created.
- Components that must be attached to scene nodes or prefabs.
- Serialized properties that must be assigned in the editor.
- Runtime flow and key state transitions.
- Complexity classification and system boundary plan, including any intentional merges, deferred systems, and extraction triggers if scope grows.
- Layout contract: target device/orientation, design resolution, fit policy, safe-area behavior, and any responsive layout controller or anchors used.
- Asset policy: generated/staged/imported assets used, deliberate placeholder geometry, pending sprites/UI/SFX/music, and the reason for any skipped asset class.
- Animation/VFX policy: sequence assets used or missing, playback system or Cocos animation components created, and any deferred effects that block production readiness.
- Verification performed and remaining editor/build steps.
