# Level Content Foundations

Use this reference when designing content that teaches, varies, and tests a Cocos game mechanic.

## Content Roles

- Teach: introduce a mechanic safely.
- Practice: let the player repeat and internalize.
- Twist: change one condition.
- Combine: pair two known ideas.
- Pressure: add time, density, scarcity, or threat.
- Reward: give relief, mastery, score, resource, or spectacle.
- Test: require confident execution or planning.

## Level Grammar

A level grammar defines what content can be built from:

- verbs: move, aim, dodge, merge, place, collect, shoot
- objects: player, enemy, obstacle, pickup, switch, goal
- parameters: speed, health, count, interval, timer, reward
- spatial rules: lanes, rooms, paths, grids, spawn zones
- temporal rules: waves, cooldowns, beats, timers
- constraints: legal combinations and forbidden combinations

Good grammar creates variety without losing readability.

## Teaching Pattern

For a new mechanic:

1. Show the object or hazard safely.
2. Let the player use or avoid it with low pressure.
3. Ask for the same action under mild pressure.
4. Combine it with one known mechanic.
5. Reward mastery or unlock the next idea.

## Procedural Content Rule

Use authored content first when:

- the game has few mechanics
- readability is not proven
- balance is unknown
- tutorialization matters
- spatial composition is important

Use procedural content when:

- content grammar is stable
- failures are easy to diagnose
- constraints can prevent unfair states
- authored examples already prove the pattern

## Wave Design Variables

- spawn interval
- active count
- enemy mix
- travel distance
- threat direction
- safe zones
- reward timing
- rest beats
- boss or elite cadence

## Fairness Rules

For arcade, dodge, runner, lane, or falling-object games, define fairness before tuning difficulty:

- minimum escape gap between simultaneous hazards
- no unavoidable overlaps at expected player speed
- warning or telegraph time before fast hazards enter the playfield
- pickup-after-risk timing so rewards do not bait guaranteed damage
- maximum simultaneous threats by screen region
- rest beats after dense waves or player recovery
- spawn exclusions around restart, revive, or tutorial moments

Difficulty should rise by shrinking safe margins within known limits, not by creating impossible states.
