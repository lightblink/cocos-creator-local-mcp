# Interaction UX Foundations

Use this reference when a Cocos mini-game needs better control feel, onboarding, UI hierarchy, or mobile interaction design.

## Principles

- Affordance: the player should infer what can be touched, dragged, aimed, or avoided.
- Feedback latency: the interface should respond immediately, even if game consequences resolve later.
- Cognitive load: the player should track only the information required for the current decision.
- Motor tolerance: touch controls need forgiveness for finger size, movement, and screen occlusion.
- State clarity: the player should know whether the game is waiting, playing, paused, failed, won, or loading.

## First 30 Seconds

Check whether the first session answers:

- What am I?
- What do I want?
- What can I touch?
- What happens when I touch it?
- What is dangerous or valuable?
- How do I try again?

Prefer teaching through layout, animation, ghost input, safe first targets, and short labels.

## Feedback Stack

A strong action often has multiple cues:

- press cue: button state, scale, glow, or drag handle
- actor cue: player movement, recoil, trail, or animation
- world cue: hit flash, spawn, camera shake, particle, or obstacle response
- UI cue: score, combo, timer, health, progress, or currency update
- audio cue: click, hit, reward, fail, or warning

Do not make every action loud. Reserve strong effects for high-value moments.

## Touch Target Guidance

- Use generous hit areas for critical inputs.
- Keep high-frequency controls away from tiny UI clusters.
- Use fixed safe zones when the game requires continuous aiming or movement.
- Avoid forcing taps near screen edges when system gestures may interfere.
- Avoid critical information under the active thumb path.

## UX Failure Modes

- The game starts before the player understands the controls.
- The player misses feedback and repeats inputs unnecessarily.
- The HUD explains too much and the playfield too little.
- Failure looks random because danger cues are late or subtle.
- Restart is buried behind menu ceremony.
- UI works in editor dimensions but fails on narrow mobile screens.
