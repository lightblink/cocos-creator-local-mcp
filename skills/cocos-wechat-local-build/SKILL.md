---
name: cocos-wechat-local-build
description: Build, inspect, and debug local Cocos Creator 3.8 WeChat Mini Game packages without publishing. Use whenever the user asks Codex to prepare a Cocos project for local wechatgame build, create or review build configs, run Cocos Creator command-line builds, inspect build/wechatgame output, check package budgets, or open/debug the result in WeChat DevTools locally.
---

# Cocos WeChat Local Build

## Overview

Use this skill for the local-only Cocos Creator to WeChat Mini Game loop: project readiness, build config, `wechatgame` command-line build, output inspection, and local simulator/debug preparation. Do not handle upload, review, release, payment, or production operations with this skill.

Target Cocos Creator 3.8.8 when the local machine has it installed; otherwise detect the configured Creator path.

## Core Workflow

1. Detect environment.
   - Prefer `cocos_local_get_environment` when the Cocos local MCP tools are available.
   - Confirm Cocos Creator path, WeChat DevTools CLI path if needed, and target project root.
2. Inspect the project.
   - If starting from zero and no project exists, use `cocos_local_create_project` to create a Cocos Creator 3.8 project from the built-in `empty-2d` template and create `assets/scenes/Main.scene` before build preparation.
   - Use `cocos_local_inspect_project` when available.
   - Check for `assets/`, `settings/`, scenes, scripts, existing build output, and project metadata.
3. Prepare build config.
   - For generated starter projects, use `cocos_local_open_project`, `cocos_local_wait_for_editor_bridge`, and `cocos_local_apply_scene_blueprint` to prepare an active saved scene before creating the final build config.
   - Reuse an already-open Cocos Creator process for the same project when possible. If old projects are still open from earlier tests, close them or use distinct editor bridge ports before trusting scene or build preparation evidence.
   - Before creating the build config, declare the target device class, orientation, design resolution, and fit policy. For phone-first WeChat Mini Games, prefer an explicit portrait design resolution such as `720x1280` or a project-proven equivalent unless the game design requires landscape.
   - Use `cocos_local_create_wechat_build_config` for a reproducible config JSON.
   - Pass `designResolution` when the MCP tool supports it. If the tool does not support it, patch the generated config or report the missing adaptation setting instead of silently building with a desktop/template default.
   - When a scene asset is known, pass `startScenePath` such as `assets/scenes/Main.scene` so the MCP reads the UUID from the `.meta` file.
   - Use placeholder appid only for local non-platform gameplay checks; ask for a real appid before testing WeChat APIs.
4. Build locally.
   - Use `cocos_local_build_wechatgame` with `configPath` when available.
   - Prefer dry run first when the project, appid, or Creator path is uncertain.
5. Inspect output.
   - Use `cocos_local_check_wechat_build_output` for required files and package budget warnings.
   - Confirm `game.json` and `project.config.json` exist under the built `wechatgame` folder.
6. Audit local runtime package risk.
   - Use `cocos_local_audit_runtime_package` before opening the simulator when the tool is available.
   - Review package budgets, largest files, oversized textures/audio, and first-package pressure.
   - Treat this as static risk analysis; it is not FPS, memory, or gameplay verification.
7. Open or prepare WeChat DevTools locally.
   - Use `cocos_local_open_wechat_devtools` to open the local `build/wechatgame` output.
   - Use `cocos_local_preview_wechat_devtools` only when preview artifacts are useful for local/debug review.
   - Use `cocos_local_manage_wechat_devtools` for cache cleanup, closing the project, or quitting DevTools.
8. Collect runtime evidence.
   - Use `cocos_local_collect_runtime_evidence` after observing launch, first input, core loop, result/failure, restart, and logs.
   - Keep build success, DevTools opening, and runtime verification as separate states in the final answer.

## Cocos Command-Line Build Shape

Cocos Creator 3.8 command-line builds use:

```bash
CocosCreator --project <projectRoot> --build "platform=wechatgame;debug=true"
```

or a build panel/exported JSON config:

```bash
CocosCreator --project <projectRoot> --build "configPath=<path-to-build-config.json>"
```

Use the config file path for repeatable local builds, because it can preserve platform package settings such as `packages.wechatgame.appid`.

## Build Config Guidance

For local development builds:

- `platform`: `wechatgame`
- `taskName` / `outputName`: usually `wechatgame`
- `debug`: `true` until release preparation
- `md5Cache`: usually `false` for fast local iteration
- `buildPath`: usually `project://build`
- `packages.wechatgame.appid`: real appid for platform API testing, placeholder only for pure local gameplay work
- `designResolution`: explicit phone adaptation target for mini-games, including width, height, and fit flags such as `{ "width": 720, "height": 1280, "fitWidth": true, "fitHeight": false }`

Do not overwrite an existing build config unless the user asks or the file is clearly generated for Codex-owned local builds.

## Output Checks

After a build, inspect:

- `build/wechatgame/`
- `game.json`
- `project.config.json`
- largest files and total size
- obvious missing assets or empty build output
- Cocos build exit code and log tail

Treat Cocos exit code `36` as build success. Treat `32` as invalid build parameters and `34` as an unexpected build failure that needs log inspection.

## Package And Runtime Guardrails

For WeChat Mini Game local builds, warn early when output size suggests package problems:

- main package budget: 4 MB
- total package budget: 20 MB

If the whole `build/wechatgame` folder exceeds 4 MB, do not automatically fail the build; report that subpackage split sizes need inspection. Recommend Asset Bundles or remote/late-loaded resources for optional content.

Use precise verification vocabulary:

- Build verified: Cocos build completed and required output files passed inspection.
- Package audited: static package and asset-size risks were reviewed.
- DevTools opened: WeChat DevTools accepted the local build path.
- Runtime verified: launch, first input, core loop, result/failure, restart, console/log review, and screenshot or scene-summary evidence all passed.

Never claim a vertical slice is runtime-verified from build output alone.

Do not treat a WeChat local build as ready for playtesting if the build config lacks an explicit adaptation strategy and the game was authored for a phone screen. Report this as an adaptation/config gap, not a gameplay polish issue.

## Local Debug Boundary

This skill may prepare or open local WeChat DevTools workflows, but must not:

- upload code
- treat preview artifacts as a release candidate
- create release candidates
- submit for review
- manage production app credentials
- change payment, ads, or backend configuration without an explicit task

## Output Standard

When completing a local build task, report:

- detected Creator path and project root
- build config path and important settings
- target orientation, design resolution, and fit/adaptation policy
- exact build command or dry-run command
- build exit code and meaning
- output directory and required file status
- package-size warnings
- package audit risks, if checked
- DevTools command result, if opened
- runtime evidence gates passed or still missing
