# Balance Foundations

Use this reference when numbers determine whether a Cocos mini-game feels fair, tense, rewarding, or grindy.

## Useful Metrics

- TTK: time to kill or time to complete an objective.
- TTF: time to fail under expected mistakes.
- APM or inputs per minute: useful for action intensity.
- Score per minute: pacing and reward density.
- Currency per run: economy income baseline.
- Runs per upgrade: progression friction.
- Spawn pressure: active threats, spawn interval, lifetime, and screen occupancy.
- Recovery margin: how much time or health remains after a mistake.

## Curve Shapes

- Linear: predictable, easy to tune, good for early prototypes.
- Exponential: powerful but can run away quickly.
- Logarithmic: strong early gains, slower later growth.
- Step curve: useful for worlds, chapters, or enemy tiers.
- Sawtooth: pressure rises and resets, useful for waves.

Choose the curve for the player experience, not because it looks sophisticated.

## Economy Loop

For any currency-like system, define:

- source: how players earn it
- sink: how players spend it
- pacing: how often they interact with it
- value: what decision it enables
- cap or drain: how hoarding is managed
- reset policy: what persists between sessions

Avoid adding economy before the core play loop proves fun unless economy is the core play loop.

## Difficulty Tools

Increase difficulty through:

- speed
- density
- reaction window
- decision complexity
- resource scarcity
- enemy combinations
- objective pressure
- reduced recovery margin

Avoid difficulty through unclear visuals, input delay, inconsistent rules, or hidden information.

## Tuning Practice

- Start with round numbers.
- Change one main parameter at a time during early playtests.
- Track observed behavior before trusting intuition.
- Keep a known-easy baseline and a known-hard baseline.
- Prefer authored level data until procedural rules are justified.

## Simulation Checklist

For timed arcade or survival games, run a lightweight deterministic sanity pass before trusting values:

- expected objects spawned during the target session
- average and peak active hazards
- expected reward or currency income per run
- pickup availability after risky actions
- dash, shield, magnet, or power-up availability by time
- upgrade payback in runs or minutes
- failure pressure after one mistake, repeated mistakes, and no mistakes
- impossible-state checks such as unavoidable overlaps or no recovery window

Report assumptions plainly. A quick simulation is a tuning smoke test, not proof of final balance.
