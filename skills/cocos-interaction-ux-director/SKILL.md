---
name: cocos-interaction-ux-director
description: Design and critique touch-first interaction, game UX, UI states, onboarding, feedback, and control feel for Cocos Creator and WeChat Mini Game projects. Use when Codex needs to improve controls, menus, HUD, restart flow, tutorials, input mapping, moment-to-moment feedback, or player comprehension before or during implementation.
---

# Cocos Interaction UX Director

## Overview

Use this skill to make Cocos mini-games feel understandable, responsive, and playable on mobile touch screens. The output should translate game intent into input rules, UI states, feedback layers, and implementation requirements.

This skill coordinates with game design, art direction, gameplay architecture, scene assembly, and playtest QA.

## Core Workflow

1. Map the player journey.
   - Cover launch, first comprehension, first input, first reward, first failure, restart, and exit.
   - Remove nonessential screens from the first local playable loop.
2. Define controls.
   - Specify gesture, target area, dead zone, drag/click behavior, hold behavior, and cancellation.
   - Make keyboard controls optional developer conveniences, not the primary path.
3. Design feedback layers.
   - For each action, define tactile-equivalent visual feedback, sound, motion, score/UI update, and game-state consequence.
   - Keep the fastest feedback local and immediate.
4. Specify UI states.
   - Define HUD, pause, result, revive, settings, loading, and tutorial states only when needed.
   - State entry and exit conditions explicitly.
5. Protect mobile readability.
   - Declare the target viewport set, orientation, design resolution, fit policy, and safe-area assumptions before implementation handoff.
   - Check thumb reach, button size, contrast, occlusion, information hierarchy, text length, and whether the primary playfield uses the intended share of the screen.
   - Avoid tiny tap targets, unintentionally shrunken playfields, and control schemes that require precision the screen cannot support.
   - Treat fixed desktop-pixel layouts without an adaptation model as a blocking UX issue for phone-first games.
6. Create implementation handoff.
   - List Cocos nodes, UI components, serialized properties, events, and animation/tween feedback needed.

## UX Deliverables

For substantial tasks, return:

- Player journey: first 30 seconds and repeat session.
- Control spec: input zones, gestures, edge cases, and fallback.
- Mobile playfield spec: safe area, thumb zone, occlusion risks, target aspect ranges, and narrow-screen behavior.
- Touch parameters: drag bounds, dead zone in pixels or screen percentage, release/cancel behavior, hold behavior, and multi-touch policy.
- UI state map: state names, transitions, blocked inputs, visible elements.
- Fail/restart flow: number of actions, default focus, blocked inputs, and recovery timing.
- Feedback matrix: action, immediate cue, state change, delayed cue.
- Onboarding plan: what is taught by layout, motion, text, or first safe action.
- Implementation notes: required components, prefabs, audio cues, and animations.

## Touch Rules

- Prefer large, forgiving input zones over precise buttons during play.
- Put high-frequency controls where thumbs naturally rest.
- Avoid placing critical UI under likely fingers.
- Use visual depression, scale, opacity, or motion on press.
- Do not require multi-touch unless the game is built around it.
- Provide restart within one obvious action after fail or win.
- Use text sparingly; show mechanics through safe first interactions when possible.

## Cocos Implementation Guidance

- Use Cocos `Button`, `Label`, `ProgressBar`, `Widget`, `Layout`, `UIOpacity`, and tweening for authored UI.
- Use Cocos touch events or an input manager to normalize touch start, move, end, cancel, and optional mouse/keyboard debug input.
- Use `Canvas`, `Widget`, and safe-area-aware layout rules for phone aspect ratios and notched screens.
- Pair UX specs with a concrete Cocos layout model: design resolution, fit width/height policy, anchors/widgets, and screen-relative gameplay/HUD regions.
- Separate UI rendering from game-state mutation.
- Expose tunable feedback timings as serialized properties.
- Keep input managers testable without platform services.
- Avoid DOM APIs for WeChat Mini Game targets.
- Treat audio unlock, pointer cancellation, app hide/show, and touch interruption as runtime edge cases for WeChat targets.

## Theory Reference

Read `references/interaction-ux-foundations.md` when the task involves control feel, onboarding, feedback timing, UI hierarchy, or mobile usability tradeoffs.

## Quality Gates

- The first action is discoverable without external explanation.
- Every frequent input has immediate feedback.
- The HUD communicates only information needed for current decisions.
- Critical controls are reachable and not hidden by fingers.
- The primary playfield, HUD, and controls remain readable in the target phone viewport screenshots or equivalent visual evidence.
- The implementation handoff includes an adaptive layout model instead of only fixed pixel coordinates.
- Pause, fail, win, and restart flows are explicit.
- UX requirements can be wired in Cocos, not only described abstractly.

## Output Standard

When completing an interaction task, report:

- Control and UI state decisions.
- Feedback requirements by action.
- Cocos implementation handoff.
- Risks for mobile, touch, readability, or WeChat runtime.
- Playtest questions focused on comprehension and feel.
