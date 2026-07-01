# Architecture

`cocos-creator-local-mcp` is organized around a narrow local automation boundary: it controls local Cocos Creator workflows, while leaving asset generation and production publishing to other tools.

## Runtime Shape

```text
MCP client
  -> stdio MCP server
    -> local filesystem operations
    -> Cocos Creator command-line process
    -> project-local Editor Bridge HTTP API
      -> Cocos Editor messages
      -> active scene scripts
```

## Main Modules

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | Starts the stdio MCP server and registers Cocos local tools. |
| `src/tools/cocos-local.ts` | Tool schemas, local project operations, bridge scaffold, scene blueprint application, and build/output checks. |
| `test/cocos-local.test.ts` | Verifies generated bridge files and mini-game skeleton output. |
| `docs/installation.md` | Installation, MCP config, and LLM-ready prompts. |

## Editor Bridge

The MCP installs a project-local Cocos Creator extension under:

```text
extensions/codex-editor-bridge/
```

The extension starts a localhost HTTP server from the Cocos editor process. Browser-side bridge routes forward safe operations into Cocos editor messages or scene scripts.

The bridge supports operations such as:

- health and route inspection
- AssetDB queries
- scene summary and node detail inspection
- scene opening
- node creation and mutation
- component attachment
- simple component property assignment
- node and asset reference assignment
- generated SpriteFrame placement on scene nodes
- scene blueprint application
- scene save

The bridge is development infrastructure. It should not be included in a production game runtime.

## Scene Blueprint Flow

Generated starter projects include:

```text
.codex/cocos/starter-scene-blueprint.json
```

The blueprint describes desired scene nodes, components, direct properties, and serialized references. The MCP opens the target scene, sends the blueprint to the bridge, applies it in the Cocos scene context, and saves only after the apply call reports success.

## Generated Sprite Placement

The high-level sprite placement tools are thin wrappers over AssetDB lookup and scene blueprint application:

```text
asset path or uuid -> AssetDB info -> SpriteFrame uuid
  -> blueprint node with Sprite component
  -> Sprite.spriteFrame asset property
  -> scene save
```

For frame-by-frame animation, the sequence assignment path uses the same AssetDB resolution step but writes an ordered asset array directly through the editor bridge:

```text
ordered frame paths -> SpriteFrame uuids
  -> component array property, e.g. SpriteFrameAnimator.frames
  -> scene save
```

This keeps asset generation outside this MCP while still making the generated files easy to place into a live Cocos scene.

## WeChat Build Flow

The build tools write a reproducible config file:

```text
.codex/cocos-build/wechatgame.build.json
```

Then they run Cocos Creator with:

```bash
CocosCreator --project <projectRoot> --build "configPath=<configPath>;logDest=<logDest>"
```

Cocos Creator returns exit code `36` for a successful build. The output checker verifies that `build/wechatgame` exists and includes required files such as `game.json` and `project.config.json`.

## Boundaries

This MCP does:

- local Cocos project creation
- scene and script scaffolding
- editor bridge installation
- scene assembly through the editor
- local `wechatgame` build execution
- build output inspection

This MCP does not:

- generate art or audio assets
- upload WeChat Mini Game packages
- submit review or publish releases
- manage production app credentials
- configure payment, ads, login, or backend services

## Safety Notes

Tool inputs require explicit project paths. Destructive behavior is conservative: existing generated files are not overwritten unless the corresponding tool input enables overwrite. Production upload and release flows are intentionally out of scope.
