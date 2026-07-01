# Companion Codex Skills

This folder contains optional Codex skills that pair with Cocos Creator Local MCP. The MCP server remains usable on its own; these skills add agent workflow guidance for Cocos gameplay implementation, scene assembly, local WeChat Mini Game build loops, package audits, and runtime evidence collection.

## Included Skills

- [`cocos-creator-gameplay-architecture`](./cocos-creator-gameplay-architecture): implement and review Cocos Creator gameplay code, UI systems, input, state flow, resources, and runtime architecture.
- [`cocos-game-reference-research-director`](./cocos-game-reference-research-director): research reference games, genre expectations, IP-safe design pillars, and downstream Cocos skill handoffs.
- [`cocos-interaction-ux-director`](./cocos-interaction-ux-director): design touch-first controls, HUD states, feedback, readability, and adaptive layout requirements for Cocos mini-games.
- [`cocos-playtest-qa-director`](./cocos-playtest-qa-director): define playtest gates, collect runtime evidence, triage defects, and verify build/playability claims.
- [`cocos-scene-prefab-assembly`](./cocos-scene-prefab-assembly): assemble Cocos scenes, prefabs, components, serialized properties, and asset references into playable local scenes.
- [`cocos-wechat-local-build`](./cocos-wechat-local-build): prepare, build, inspect, audit, open, and collect runtime evidence for local `wechatgame` packages without publishing.

## Install For Codex

```bash
mkdir -p ~/.codex/skills
cp -R skills/cocos-creator-gameplay-architecture ~/.codex/skills/
cp -R skills/cocos-game-reference-research-director ~/.codex/skills/
cp -R skills/cocos-interaction-ux-director ~/.codex/skills/
cp -R skills/cocos-playtest-qa-director ~/.codex/skills/
cp -R skills/cocos-scene-prefab-assembly ~/.codex/skills/
cp -R skills/cocos-wechat-local-build ~/.codex/skills/
```

Restart Codex after installing or updating skills.
