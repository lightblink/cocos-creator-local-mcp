# Game Design Foundations

Use this reference when design quality depends on theory, not just task routing.

## Design Lenses

- Core loop: the repeatable cycle of action, feedback, reward, escalation, and reset.
- MDA: mechanics are rules, dynamics are runtime behavior, aesthetics are player feelings.
- Skill test: the thing the player improves at, such as timing, aiming, planning, reading, routing, or risk judgment.
- Decision density: how often the player makes meaningful choices per minute.
- Risk and reward: player agency increases when danger, opportunity, cost, and timing are legible.
- Readability: the player should understand state, threat, affordance, and consequence at game speed.

## Mini-Game Constraints

WeChat Mini Games often need faster comprehension than PC or console games. Favor:

- one-handed or simple two-thumb controls
- short session loops
- immediate restart
- minimal first-run text
- strong visual and audio feedback
- low loading and low first-package asset demand

## Good Core Loop Checklist

- The player has a goal visible now.
- The player can act without reading a manual.
- The action changes game state immediately.
- The result is readable through motion, sound, UI, or score.
- The next challenge is slightly different or slightly harder.
- The loop can fail, recover, and restart cleanly.

## Common Design Failure Modes

- Content-first design: many assets, weak decisions.
- Feature pileup: several systems competing before one loop works.
- Hidden rules: players fail without understanding why.
- Reward delay: actions do not feel connected to outcomes.
- Unscoped meta: progression systems added before play is fun.
- Fake difficulty: challenge comes from poor visibility, latency, or surprise rules.

## Vertical Slice Definition

A vertical slice should include one complete playable path:

- one scene or level
- one player goal
- one main challenge
- one success state
- one failure state
- restart
- minimum UI
- placeholder or first-pass assets
- measurable performance and package constraints

Avoid claiming a slice is complete if it requires manual scene setup that has not been documented or automated.
