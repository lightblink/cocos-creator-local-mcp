# Contributing

Thanks for considering a contribution to `cocos-creator-local-mcp`.

## Development Setup

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Guidelines

- Keep the MCP boundary focused on local Cocos Creator automation.
- Do not add AI asset generation to this repository; use a separate asset MCP.
- Prefer small, well-scoped tools with explicit inputs and clear output JSON.
- Avoid production publishing, upload, payment, ads, login, or credential-management features unless the project scope is explicitly revised.
- Add tests for generated bridge files, skeleton files, and build/config behavior where possible.

## Local Smoke Tests

Full smoke tests require Cocos Creator 3.8.8 installed on the host machine. A typical smoke test creates a disposable Cocos project, opens it in Cocos Creator, applies a blueprint, saves the scene, builds `wechatgame`, and checks the output directory.
