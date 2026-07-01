---
name: cocos-scene-prefab-assembly
description: Assemble Cocos Creator 3.8 scenes, prefabs, nodes, components, serialized properties, UI roots, managers, pools, and asset references into playable local game scenes. Use whenever the user asks Codex to wire gameplay into a Cocos scene, create or update prefabs, attach scripts, assign generated assets, define node hierarchy, or turn code/assets into a runnable prototype.
---

# Cocos Scene Prefab Assembly

## Overview

Use this skill when the work is not just writing TypeScript, but making a Cocos Creator scene or prefab playable. The output should identify the node hierarchy, components, serialized properties, asset references, and verification steps needed for the scene to run locally.

Prefer editor/MCP operations when available. If direct editor control is not available, produce an exact assembly plan and avoid claiming the scene is wired until it has been wired.

## Assembly Workflow

1. Inspect existing scene and prefab conventions.
   - Look for `assets/scenes`, `assets/prefabs`, `assets/scripts`, `assets/ui`, `assets/resources`, and existing manager/root node patterns.
   - If the Cocos local MCP tools are available, use `cocos_local_inspect_project` first.
   - If direct editor scene access is needed, install or check the Codex editor bridge with `cocos_local_install_editor_bridge` and `cocos_local_check_editor_bridge`.
   - Before launching Cocos Creator, reuse an existing editor process for the same project when available. If multiple projects are already open, make the active project and bridge port explicit before applying scene changes.
   - If a new scene asset is needed, use `cocos_local_create_scene_from_template` to create a Creator 3.8 default 2D scene under `assets/scenes`.
2. Define the runtime graph.
   - Identify persistent managers, gameplay roots, UI roots, pools, cameras, canvas, and authored content.
   - Define the scene layout contract before node placement: target orientation, design resolution, fit policy, gameplay region, HUD region, safe-area margins, and how narrow/tall screens adapt.
   - For a new 2D mini-game scene, prefer `cocos_local_create_minigame_skeleton` to generate baseline scripts and a starter scene blueprint before custom assembly.
   - For non-trivial games, use the architecture plan from `cocos-creator-gameplay-architecture` or `cocos_local_create_architecture_skeleton` as a guide before placing managers. Scene nodes should host adapters and roots; they do not need to mirror every pure TypeScript system.
3. Map components to nodes.
   - For each component, specify host node, required serialized properties, optional properties, and event bindings.
4. Map assets to references.
   - Identify sprites, audio clips, prefabs, animation clips, fonts, and bundle/resource paths.
   - For from-zero playable scenes, confirm whether each first-loop visual/audio class is generated, existing, deliberately geometry-only, or pending. Do not let missing sprite/UI/SFX/music assets disappear as an implicit scene-assembly choice.
   - For generated gameplay art, confirm role/orientation review and animation requirements before assigning the asset to scene nodes or prefabs.
5. Create or update prefabs for repeated objects.
   - Player, enemy, bullet, pickup, effect, floating text, and reusable UI items should normally be prefabs.
6. Verify scene entry.
   - Confirm start scene, Canvas/camera presence, design resolution alignment, initial state, input path, UI visibility, and reset/restart behavior.
   - If claiming local runtime verification, pair scene assembly checks with `cocos_local_collect_runtime_evidence` after the project has run in Cocos preview or WeChat DevTools.

## Editor Bridge Workflow

When the project has the Codex editor bridge enabled in Cocos Creator:

- Use `cocos_local_call_editor_bridge` with `GET /health` to confirm the bridge is running.
- Use `cocos_local_wait_for_editor_bridge` after launching or refreshing Cocos Creator when the bridge may still be starting.
- Use `GET /routes` to confirm the bridge version and available HTTP routes.
- Use `POST /scene/summary` to inspect the open scene tree before editing.
- Use `POST /scene/node-detail` to inspect one node and its nearby children/components.
- Use `POST /assets/query` to find assets by AssetDB pattern before assigning references.
- Use `POST /assets/info` to resolve a `db://assets/...` URL or UUID into asset metadata.
- Use `POST /scene/create-node` for simple node creation.
- Use `POST /scene/set-node` for simple node rename, active state, position, and scale changes.
- Use `POST /scene/add-component` for built-in Cocos components or imported custom components by `@ccclass` name.
- Use `POST /scene/set-component-property` only for simple direct component properties.
- Use `POST /scene/set-component-asset-property` for direct asset reference properties after resolving the asset UUID with `/assets/info` or `/assets/query`.
- Use `POST /scene/apply-blueprint` when a generated or hand-authored blueprint should create multiple nodes, attach components, and assign simple properties or node references in one pass.
- Use `cocos_local_apply_scene_blueprint` for the standard generated blueprint file under `.codex/cocos/starter-scene-blueprint.json`.
- Use `POST /scene/save` after successful scene mutations when the bridge/editor reports the route is supported.
- Use `POST /editor/message` only for allowlisted Cocos editor messages when a higher-level route is missing.

If the bridge files are installed but HTTP ping fails, tell the user to open the project in Cocos Creator and enable or refresh the project extension. Do not claim live scene edits were made unless the bridge call succeeded.

When adding a custom script component, make sure the script exists under `assets/`, Cocos has imported/compiled it, and the component type matches the `@ccclass('...')` name. If adding fails, refresh the editor asset database or reopen the scene before retrying.

## Node Hierarchy Pattern

Use project conventions first. For a new 2D mini-game scene, this default shape is acceptable:

```text
Scene
  Canvas
    GameRoot
      PlayerSpawn
      EnemyRoot
      ProjectileRoot
      PickupRoot
      EffectRoot
    UIRoot
      HUD
      PausePanel
      ResultPanel
    Managers
      GameManager
      InputManager
      AudioManager
      PoolManager
```

Keep world/gameplay nodes separate from UI nodes. Keep manager nodes stable and named predictably so serialized references remain understandable.

For phone-first mini-games, do not assemble the scene around a hardcoded desktop-sized board or HUD. Use Canvas plus `Widget`, `Layout`, anchor-aware transforms, or a layout controller so the playfield occupies the intended share of the target screen and remains readable after Cocos screen fitting.

For production-oriented slices, let scene hierarchy support system boundaries without turning every system into a node. Use nodes for authored references and Cocos lifecycle adapters, and keep pure domain systems in TypeScript modules when that reduces coupling.

When using a generated starter blueprint, inspect the JSON before applying it. It should be treated as an assembly plan: open or create a scene in Cocos Creator, apply it through the bridge, check warnings, then save the scene only after the resulting node tree and component assignments look correct.

## Prefab Rules

- Use prefabs for repeated runtime objects.
- Keep prefab dependencies explicit and small.
- Avoid prefab scripts that silently search the whole scene for managers unless that is the project convention.
- Provide an initialization method for runtime data such as speed, damage, owner, score value, or target.
- Provide a reset/despawn method for pooled prefabs.
- Keep visual child nodes under a named child such as `View` when gameplay root transforms differ from sprite transforms.
- For animated gameplay objects, wire sprite sheets, `AnimationClip`s, frame-sequence players, VFX prefabs, or state-specific child nodes as part of scene assembly. Do not leave animation assets staged but unreachable from runtime.
- For directional generated sprites, verify the node rotation/scale does not compensate for a wrong source asset unless the correction is intentional and documented.

## Serialized Property Contract

For every component that requires editor assignment, report:

- component class
- host node path
- property name
- expected asset/node/component type
- required or optional
- fallback behavior if unassigned

Do not leave hidden wiring assumptions. If a property must be assigned in the editor and no editor MCP is available, list it as a remaining manual step.

## Asset Assignment

- Generated sprite assets should become `SpriteFrame` references on `Sprite` components or animation frames.
- Repeated animation frames should become an `AnimationClip` or documented frame sequence, not loose unreferenced PNGs.
- Audio files should be assigned to `AudioClip` references, an `AudioSource`, or loaded through an intentional runtime path. If no high-level audio assignment MCP tool exists, use the editor bridge asset-property route when possible or report the exact pending assignment.
- UI icon/button art should be assigned to UI `Sprite` components and checked at target resolution.
- Keep generated/staged assets separate from accepted runtime assets until the user accepts them.

## Verification Gates

Before claiming assembly is complete, verify or explicitly report as pending:

- target scene exists and is included or marked as start scene for build
- required scripts compile
- required components are attached to the intended nodes
- required serialized properties are assigned
- non-trivial gameplay has a system boundary plan or a clear rationale for a compact adapter, with unrelated domains easy to extract if scope grows
- prefab instances can be spawned without missing references
- UI panels start in the correct visibility state
- Canvas, camera, and UI/gameplay layout match the declared design resolution and fit policy
- target-runtime screenshot or equivalent visual evidence shows the primary playfield, HUD, and controls are readable and not unintentionally tiny, cropped, or letterboxed
- gameplay can enter, restart, win/lose, or return to menu as designed
- no required asset remains only in a generated/staging folder
- missing first-loop sprite, UI, SFX, or music assets are explicitly accepted as intentional placeholders or listed as pending
- required first-loop animation assets are wired to `AnimationClip`, frame-sequence playback, or VFX prefabs and can be triggered in runtime
- gameplay-critical directional sprites face the correct way without hidden transform hacks
- editor bridge calls succeeded when live scene edits were claimed
- the active editor project and bridge port match the intended project when multiple Cocos Creator windows are open
- runtime evidence was collected before claiming the assembled scene is playable in the simulator

## Output Standard

When completing assembly work, return:

- scene and prefab files changed or created
- node hierarchy changes
- components attached and serialized properties assigned
- assets referenced and any staged assets not yet accepted
- verification performed
- exact remaining editor steps if direct scene editing was not available
