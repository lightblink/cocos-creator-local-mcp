#!/usr/bin/env node
import { Command } from "commander";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCocosLocalTools } from "./tools/cocos-local.js";

const program = new Command()
  .name("cocos-creator-local-mcp")
  .description("MCP server for local Cocos Creator automation, scene assembly, and WeChat Mini Game builds.")
  .option("--stdio", "Run on stdio transport", true);

program.parse(process.argv);

const server = new McpServer({
  name: "cocos-creator-local-mcp",
  version: "0.1.0"
});

registerCocosLocalTools(server);

await server.connect(new StdioServerTransport());
