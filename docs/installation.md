# Installation

This guide covers local installation, MCP client configuration, LLM-ready prompts, and uninstall steps for `cocos-creator-local-mcp`.

## Prerequisites

- Node.js 20 or newer.
- Cocos Creator 3.8.8 installed locally.
- A coding agent or MCP client that supports stdio MCP servers.

Default macOS Cocos Creator path:

```text
/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator
```

## Install From Source

```bash
git clone https://github.com/lightblink/cocos-creator-local-mcp.git
cd cocos-creator-local-mcp
npm install
npm run build
```

## MCP Client Config

```json
{
  "mcpServers": {
    "cocos-creator-local": {
      "command": "node",
      "args": [
        "/absolute/path/to/cocos-creator-local-mcp/dist/index.js"
      ],
      "startup_timeout_sec": 120
    }
  }
}
```

Restart your MCP client after changing its config.

## Smoke Test

After your MCP client exposes the server, ask the agent to call:

```text
cocos_local_get_environment
```

The result should report whether the local Cocos Creator executable and WeChat DevTools CLI were found.

## LLM Install Prompt

Paste this into a coding agent that can edit your local MCP config:

```text
Install the local MCP server "cocos-creator-local-mcp" for this MCP client.

Repository path:
/absolute/path/to/cocos-creator-local-mcp

Steps:
1. Run npm install in the repository.
2. Run npm run build.
3. Add an MCP stdio server named "cocos-creator-local" with command "node" and args ["/absolute/path/to/cocos-creator-local-mcp/dist/index.js"].
4. Preserve any existing MCP servers.
5. Restart or tell me to restart the MCP client if needed.
6. Verify by listing tools or calling cocos_local_get_environment.

Do not add asset generation tools to this server; keep asset generation MCPs separate.
```

## Uninstall

1. Remove the `cocos-creator-local` entry from your MCP client config.
2. Restart the MCP client.
3. Delete the local repository only if you no longer need it.

This does not delete Cocos projects generated with the MCP.

## LLM Uninstall Prompt

```text
Uninstall the MCP server named "cocos-creator-local" from this MCP client config.

Steps:
1. Remove only the "cocos-creator-local" MCP server entry.
2. Preserve all other MCP servers.
3. Do not delete generated Cocos projects.
4. Tell me whether a client restart is required.
```

## Pairing With An Asset MCP

This server handles local Cocos project automation. It does not generate sprites, music, sound effects, tilesets, or UI art. For asset generation, configure a separate asset MCP server and keep both entries side by side in your client config.
