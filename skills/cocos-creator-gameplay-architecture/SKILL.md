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
   - Keep a small vertical slice playable before adding breadth.
   - For a new mini-game prototype, use `cocos_local_create_minigame_skeleton` when available to create a baseline GameManager, HUD, input, player controller, pool manager, and starter scene blueprint.
3. Implement Cocos components.
   - Use `@ccclass`, `@property`, and `Component` lifecycle correctly.
   - Expose scene-tunable values with typed `@property` fields instead of magic constants.
   - If available, use `cocos_local_create_component_script` to create new TypeScript component files with valid Cocos Creator 3.8 structure.
4. Wire scene dependencies deliberately.
   - Prefer explicit serialized references for authored scene nodes.
   - Use lookup helpers sparingly and fail loudly when required nodes are missing.
   - For generated starter projects, open the project with `cocos_local_open_project`, wait with `cocos_local_wait_for_editor_bridge`, then apply the starter blueprint with `cocos_local_apply_scene_blueprint` after a scene is active.
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

## UI And Input

- Use Cocos UI components for authored UI: `Button`, `Label`, `ProgressBar`, `Layout`, `Widget`, `UIOpacity`.
- Separate UI rendering from game state mutation. The HUD observes state or receives update calls; it should not own game rules.
- Support touch-first input for WeChat Mini Game targets.
- Keep keyboard shortcuts as development conveniences, not the only control path.
- Make restart, pause/resume, win, lose, and loading states explicit.

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

## Output Standard

When completing a gameplay task, report:

- Scripts changed or created.
- Components that must be attached to scene nodes or prefabs.
- Serialized properties that must be assigned in the editor.
- Runtime flow and key state transitions.
- Verification performed and remaining editor/build steps.
