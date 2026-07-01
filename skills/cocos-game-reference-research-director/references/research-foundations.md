# Game Reference Research Foundations

## Purpose

Reference research should help Codex understand player expectations without turning the project into a clone. The useful output is not a long review; it is a compact translation from reference evidence into design decisions.

## Evidence Ladder

Prefer sources in this order when available:

1. Official store pages, publisher sites, manuals, patch notes, press kits, and trailers.
2. Direct gameplay footage, screenshots, and livestreams where mechanics can be observed.
3. Reputable wikis, interviews, guides, and postmortems.
4. Player reviews and community posts for expectation and frustration signals.
5. General memory or genre knowledge when the task is low-risk or browsing is unnecessary.

Treat marketing claims as claims, not proof. Treat gameplay footage as stronger evidence for moment-to-moment loops.

## Observation vs Inference

Keep these separate:

- Observation: "The reference uses one-finger movement and auto-fire."
- Inference: "Our first slice should prioritize drag feel and continuous shooting before equipment depth."

This separation prevents hallucinated certainty and makes later design disagreements easier to resolve.

## IP-Safe Translation

Safe to borrow at an abstract level:

- genre conventions
- control models
- pacing structures
- high-level reward patterns
- combat readability principles
- broad fantasy categories
- common content types such as waves, bosses, upgrades, pickups, or maps

Avoid copying:

- exact names, logos, characters, factions, UI layout, icons, art silhouettes, music hooks, copywriting, proprietary equipment sets, exact level/wave sequences, and signature combinations that identify the reference
- "same but renamed" implementations of distinctive commercial systems

When in doubt, alter at least two of: fantasy, visual language, system expression, progression shape, content grammar, and audio identity.

## Reference Deconstruction Checklist

Use only the sections relevant to the task:

- Promise: what fantasy or emotion the reference sells.
- Camera and input: viewpoint, controls, precision, allowed mistakes.
- Core loop: repeated action, feedback, reward, escalation, reset.
- Skill test: reaction, planning, memory, optimization, aiming, timing, risk management.
- Content grammar: enemies, hazards, levels, waves, pickups, bosses, missions, modifiers.
- Progression: session growth, meta growth, equipment, upgrades, unlocks, collections.
- Economy: currencies, sinks, rewards, fail rewards, comeback mechanics.
- Feedback: hit, kill, reward, danger, near miss, combo, fail, win, juice.
- Audio: primary action sounds, warning cues, reward cues, music mood, loop length.
- UI/UX: HUD density, touch zones, onboarding, pause/restart, result flow.
- Technical pressure: object count, pooling, particles, collision, data tables, build size.

## Cocos Handoff Shape

A good handoff tells downstream skills:

- The first playable promise.
- The mechanics to prove now.
- The mechanics to fake or defer.
- Candidate systems and data tables.
- Minimal asset and audio families.
- Touch and HUD constraints.
- Content unit and wave/level format.
- Balance values that need v0 defaults.
- QA evidence that would prove the slice works.

## Degree Of Freedom

Do not convert research into a rigid blueprint too early. The right amount of structure depends on the requested slice:

- Greybox: use only core loop, controls, failure, and one content unit.
- Vertical slice: add content grammar, v0 numbers, asset families, and architecture pressure points.
- Production-oriented planning: add competitor comparison, progression, economy, retention, technical risks, and style differentiation.
