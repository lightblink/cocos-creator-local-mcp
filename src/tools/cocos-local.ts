import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const defaultMacCreatorPath = "/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator";
const defaultMacWeChatDevToolsPath = "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";

const projectRootInput = z.object({
  projectRoot: z.string().min(1).describe("Absolute or relative path to a Cocos Creator project root.")
});

const getEnvironmentInput = z.object({
  creatorPath: z.string().optional().describe("Optional explicit CocosCreator executable path."),
  wechatDevToolsCliPath: z.string().optional().describe("Optional explicit WeChat DevTools CLI path.")
});

const createProjectInput = z.object({
  projectRoot: z.string().min(1),
  gameName: z.string().optional().describe("Project package name. Defaults to the project directory name."),
  creatorPath: z.string().optional().describe("Optional explicit CocosCreator executable path used to locate built-in templates."),
  templateName: z.enum(["empty-2d", "empty", "empty-quality", "hello-3d-world"]).default("empty-2d"),
  createScene: z.boolean().default(true),
  scenePath: z.string().default("assets/scenes/Main.scene"),
  createSkeleton: z.boolean().default(true),
  installEditorBridge: z.boolean().default(true),
  editorBridgePort: z.number().int().min(1024).max(65535).default(17388),
  overwrite: z.boolean().default(false)
});

const openProjectInput = z.object({
  projectRoot: z.string().min(1),
  creatorPath: z.string().optional(),
  waitForBridge: z.boolean().default(false),
  port: z.number().int().min(1024).max(65535).default(17388),
  timeoutMs: z.number().int().positive().max(5 * 60 * 1000).default(90 * 1000),
  dryRun: z.boolean().default(false)
});

const createSceneFromTemplateInput = z.object({
  projectRoot: z.string().min(1),
  creatorPath: z.string().optional(),
  scenePath: z.string().default("assets/scenes/Main.scene"),
  sceneName: z.string().default("Main"),
  template: z.enum(["2d", "3d", "quality"]).default("2d"),
  overwrite: z.boolean().default(false)
});

const designResolutionInput = z.object({
  width: z.number().int().positive().describe("Cocos design resolution width in logical pixels."),
  height: z.number().int().positive().describe("Cocos design resolution height in logical pixels."),
  fitWidth: z.boolean().optional().describe("Whether Cocos should fit width for screen adaptation."),
  fitHeight: z.boolean().optional().describe("Whether Cocos should fit height for screen adaptation."),
  policy: z.number().int().optional().describe("Optional Creator screen policy value; omit unless matching a known project setting.")
});

const createWechatBuildConfigInput = z.object({
  projectRoot: z.string().min(1),
  appid: z.string().default("wx0000000000000000"),
  gameName: z.string().default("Cocos WeChat Game"),
  outputName: z.string().default("wechatgame"),
  buildPath: z.string().default("project://build"),
  debug: z.boolean().default(true),
  md5Cache: z.boolean().default(false),
  startScene: z.string().optional().describe("Optional start scene UUID."),
  startScenePath: z.string().optional().describe("Optional scene asset path such as assets/scenes/Main.scene; used to read the startScene UUID from its .meta file."),
  scenes: z.array(z.unknown()).optional().describe("Optional Cocos build scenes array."),
  designResolution: designResolutionInput.optional().describe("Optional Cocos design resolution for local phone adaptation, e.g. 720x1280 with fitWidth."),
  packages: z.record(z.unknown()).optional().describe("Optional extra platform package config to merge under packages.wechatgame."),
  configPath: z.string().optional().describe("Where to write the build config JSON. Defaults to .codex/cocos-build/wechatgame.build.json under the project."),
  overwrite: z.boolean().default(false)
});

const buildWechatGameInput = z.object({
  projectRoot: z.string().min(1),
  creatorPath: z.string().optional(),
  configPath: z.string().optional().describe("Build config JSON path created by cocos_local_create_wechat_build_config."),
  buildOptions: z.string().optional().describe("Raw Cocos --build option string. Overrides configPath when provided."),
  logDest: z.string().optional().describe("Optional Cocos build log file path."),
  timeoutMs: z.number().int().positive().max(30 * 60 * 1000).default(10 * 60 * 1000),
  dryRun: z.boolean().default(false)
});

const checkWechatBuildOutputInput = z.object({
  projectRoot: z.string().min(1),
  outputDir: z.string().optional().describe("Path to built wechatgame folder. Defaults to <projectRoot>/build/wechatgame."),
  mainPackageLimitBytes: z.number().int().positive().default(4 * 1024 * 1024),
  totalPackageLimitBytes: z.number().int().positive().default(20 * 1024 * 1024)
});

const wechatDevToolsBaseInput = z.object({
  projectRoot: z.string().min(1),
  outputDir: z.string().default("build/wechatgame").describe("Path to the built WeChat Mini Game folder, relative to projectRoot unless absolute."),
  wechatDevToolsCliPath: z.string().optional().describe("Optional explicit WeChat DevTools CLI path."),
  port: z.number().int().min(1024).max(65535).optional().describe("Optional WeChat DevTools automation HTTP port."),
  lang: z.enum(["en", "zh"]).default("en"),
  debug: z.boolean().default(false),
  disableGpu: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(5 * 60 * 1000).default(60 * 1000),
  dryRun: z.boolean().default(false)
});

const openWechatDevToolsInput = wechatDevToolsBaseInput.extend({
  requireOutput: z.boolean().default(true).describe("When true, fail if outputDir does not exist before opening DevTools.")
});

const previewWechatDevToolsInput = wechatDevToolsBaseInput.extend({
  qrFormat: z.enum(["terminal", "image", "base64"]).default("terminal"),
  qrOutput: z.string().optional().describe("Optional QR output path, relative to projectRoot unless absolute."),
  qrSize: z.string().optional(),
  infoOutput: z.string().optional().describe("Optional preview info output path, relative to projectRoot unless absolute.")
});

const manageWechatDevToolsInput = z.object({
  projectRoot: z.string().min(1),
  outputDir: z.string().default("build/wechatgame"),
  wechatDevToolsCliPath: z.string().optional(),
  action: z.enum(["clean-cache", "close", "quit"]),
  cacheType: z.enum(["storage", "file", "compile", "auth", "network", "session", "all"]).default("compile"),
  port: z.number().int().min(1024).max(65535).optional(),
  lang: z.enum(["en", "zh"]).default("en"),
  timeoutMs: z.number().int().positive().max(5 * 60 * 1000).default(60 * 1000),
  dryRun: z.boolean().default(false)
});

const auditLocalPackageInput = z.object({
  projectRoot: z.string().min(1),
  outputDir: z.string().default("build/wechatgame"),
  includeProjectAssets: z.boolean().default(false).describe("Also audit project assets/ in addition to the built output."),
  mainPackageLimitBytes: z.number().int().positive().default(4 * 1024 * 1024),
  totalPackageLimitBytes: z.number().int().positive().default(20 * 1024 * 1024),
  largeFileWarningBytes: z.number().int().positive().default(512 * 1024),
  textureDimensionWarning: z.number().int().positive().default(2048),
  audioWarningBytes: z.number().int().positive().default(1024 * 1024)
});

const collectRuntimeEvidenceInput = z.object({
  projectRoot: z.string().min(1),
  scenePath: z.string().default("assets/scenes/Main.scene"),
  outputDir: z.string().default("build/wechatgame"),
  bridgePort: z.number().int().min(1024).max(65535).default(17388),
  checkEditorBridge: z.boolean().default(true),
  checkBuildOutput: z.boolean().default(true),
  runtime: z.enum(["not-run", "cocos-editor", "cocos-preview", "wechat-devtools", "other"]).default("not-run"),
  runtimeStatus: z.enum(["not-run", "opened", "verified"]).default("not-run"),
  screenshotPath: z.string().optional().describe("Optional screenshot evidence path, relative to projectRoot unless absolute."),
  logPath: z.string().optional().describe("Optional runtime log evidence path, relative to projectRoot unless absolute."),
  evidence: z.object({
    launch: z.boolean().default(false),
    firstInput: z.boolean().default(false),
    coreLoop: z.boolean().default(false),
    resultOrFailure: z.boolean().default(false),
    restart: z.boolean().default(false),
    consoleReviewed: z.boolean().default(false)
  }).default({
    launch: false,
    firstInput: false,
    coreLoop: false,
    resultOrFailure: false,
    restart: false,
    consoleReviewed: false
  })
});

const createComponentScriptInput = z.object({
  projectRoot: z.string().min(1),
  className: z.string().min(1).describe("Cocos component class name, e.g. GameManager or PlayerController."),
  scriptPath: z.string().optional().describe("Path under project assets, e.g. assets/scripts/GameManager.ts. Defaults to assets/scripts/<className>.ts."),
  baseClass: z.enum(["Component"]).default("Component"),
  description: z.string().optional().describe("Optional short comment describing component responsibility."),
  properties: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(["Node", "Label", "Sprite", "AudioClip", "Prefab", "number", "string", "boolean"]),
    defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional()
  })).default([]),
  lifecycle: z.array(z.enum(["onLoad", "start", "update", "onEnable", "onDisable", "onDestroy"])).default(["start"]),
  overwrite: z.boolean().default(false)
});

const createMinigameSkeletonInput = z.object({
  projectRoot: z.string().min(1),
  gameName: z.string().min(1).default("Codex Mini Game"),
  scriptDir: z.string().default("assets/scripts/codex").describe("Directory under project assets/ for generated TypeScript components."),
  blueprintPath: z.string().default(".codex/cocos/starter-scene-blueprint.json").describe("Where to write the scene assembly blueprint JSON under the project root."),
  targetScore: z.number().int().positive().default(10),
  overwrite: z.boolean().default(false)
});

const createArchitectureSkeletonInput = z.object({
  projectRoot: z.string().min(1),
  gameName: z.string().min(1).default("Codex Game"),
  preset: z.enum(["generic-vertical-slice", "tower-defense"]).default("generic-vertical-slice"),
  scriptDir: z.string().default("assets/scripts/game").describe("Directory under project assets/ for generated architecture modules."),
  planPath: z.string().default(".codex/cocos/architecture-plan.json").describe("Where to write the architecture plan JSON under the project root."),
  overwrite: z.boolean().default(false)
});

const installEditorBridgeInput = z.object({
  projectRoot: z.string().min(1),
  extensionName: z.string().min(1).default("codex-editor-bridge"),
  port: z.number().int().min(1024).max(65535).default(17388),
  overwrite: z.boolean().default(false)
});

const checkEditorBridgeInput = z.object({
  projectRoot: z.string().min(1),
  extensionName: z.string().min(1).default("codex-editor-bridge"),
  port: z.number().int().min(1024).max(65535).default(17388),
  pingHttp: z.boolean().default(true)
});

const callEditorBridgeInput = z.object({
  port: z.number().int().min(1024).max(65535).default(17388),
  route: z.string().default("/health").describe("HTTP route exposed by the editor bridge, such as /health or /scene/summary."),
  method: z.enum(["GET", "POST"]).default("GET"),
  body: z.record(z.unknown()).optional(),
  timeoutMs: z.number().int().positive().max(60000).default(5000)
});

const waitEditorBridgeInput = z.object({
  port: z.number().int().min(1024).max(65535).default(17388),
  timeoutMs: z.number().int().positive().max(5 * 60 * 1000).default(90 * 1000),
  intervalMs: z.number().int().positive().max(10000).default(1000)
});

const applySceneBlueprintInput = z.object({
  projectRoot: z.string().min(1),
  blueprintPath: z.string().default(".codex/cocos/starter-scene-blueprint.json"),
  scenePath: z.string().default("assets/scenes/Main.scene"),
  openScene: z.boolean().default(true),
  openSceneDelayMs: z.number().int().min(0).max(30000).default(1500),
  port: z.number().int().min(1024).max(65535).default(17388),
  timeoutMs: z.number().int().positive().max(120000).default(30000),
  saveScene: z.boolean().default(true)
});

const openSceneInput = z.object({
  projectRoot: z.string().min(1),
  scenePath: z.string().default("assets/scenes/Main.scene"),
  sceneUuid: z.string().optional(),
  port: z.number().int().min(1024).max(65535).default(17388),
  timeoutMs: z.number().int().positive().max(60000).default(30000)
});

const vec3Input = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  z: z.number().default(0)
});

const spriteAssetPlacementInput = z.object({
  assetPath: z.string().min(1).describe("Sprite asset reference: db://assets/..., assets/..., absolute project path, or a SpriteFrame UUID."),
  nodePath: z.string().optional().describe("Full node path to ensure, e.g. Scene/Canvas/GameRoot/Player."),
  parentPath: z.string().default("Scene/Canvas/GameRoot"),
  name: z.string().optional(),
  position: vec3Input.default({ x: 0, y: 0, z: 0 }),
  scale: vec3Input.default({ x: 1, y: 1, z: 1 }),
  active: z.boolean().default(true)
});

const assignSpriteFrameInput = z.object({
  projectRoot: z.string().min(1),
  nodePath: z.string().min(1).describe("Existing scene node path, e.g. Scene/Canvas/GameRoot/Player."),
  assetPath: z.string().min(1).describe("Sprite asset reference: db://assets/..., assets/..., absolute project path, or a SpriteFrame UUID."),
  scenePath: z.string().default("assets/scenes/Main.scene"),
  openScene: z.boolean().default(false),
  addSpriteComponent: z.boolean().default(true),
  port: z.number().int().min(1024).max(65535).default(17388),
  timeoutMs: z.number().int().positive().max(120000).default(30000),
  saveScene: z.boolean().default(true)
});

const assignSpriteFrameSequenceInput = z.object({
  projectRoot: z.string().min(1),
  nodePath: z.string().min(1).describe("Existing scene node path, e.g. Scene/Canvas/GameRoot/Player."),
  assetPaths: z.array(z.string().min(1)).min(1).max(128).describe("Ordered frame references: db://assets/..., assets/..., absolute project paths, or SpriteFrame UUIDs."),
  componentType: z.string().min(1).default("SpriteFrameAnimator"),
  property: z.string().min(1).default("frames"),
  scenePath: z.string().default("assets/scenes/Main.scene"),
  openScene: z.boolean().default(false),
  addComponent: z.boolean().default(true),
  port: z.number().int().min(1024).max(65535).default(17388),
  timeoutMs: z.number().int().positive().max(120000).default(30000),
  saveScene: z.boolean().default(true)
});

const createSpriteNodeInput = z.object({
  projectRoot: z.string().min(1),
  scenePath: z.string().default("assets/scenes/Main.scene"),
  openScene: z.boolean().default(false),
  openSceneDelayMs: z.number().int().min(0).max(30000).default(1000),
  sprite: spriteAssetPlacementInput,
  port: z.number().int().min(1024).max(65535).default(17388),
  timeoutMs: z.number().int().positive().max(120000).default(30000),
  saveScene: z.boolean().default(true)
});

const placeSpriteAssetsInput = z.object({
  projectRoot: z.string().min(1),
  scenePath: z.string().default("assets/scenes/Main.scene"),
  openScene: z.boolean().default(false),
  openSceneDelayMs: z.number().int().min(0).max(30000).default(1000),
  sprites: z.array(spriteAssetPlacementInput).min(1).max(64),
  port: z.number().int().min(1024).max(65535).default(17388),
  timeoutMs: z.number().int().positive().max(120000).default(30000),
  saveScene: z.boolean().default(true)
});

export function registerCocosLocalTools(server: McpServer): void {
  server.registerTool("cocos_local_get_environment", {
    title: "Get Local Cocos Environment",
    description: "Detect local Cocos Creator and WeChat DevTools CLI paths for local WeChat Mini Game development.",
    inputSchema: getEnvironmentInput
  }, async (input) => textResult(await getEnvironment(input)));

  server.registerTool("cocos_local_create_project", {
    title: "Create Cocos Project",
    description: "Create a local Cocos Creator 3.8 project from a built-in template, optionally adding Codex mini-game skeleton scripts and the editor bridge.",
    inputSchema: createProjectInput
  }, async (input) => textResult(await createProject(input)));

  server.registerTool("cocos_local_open_project", {
    title: "Open Cocos Project",
    description: "Launch Cocos Creator 3.8 for a local project and optionally wait until the Codex editor bridge responds.",
    inputSchema: openProjectInput
  }, async (input) => textResult(await openProject(input)));

  server.registerTool("cocos_local_create_scene_from_template", {
    title: "Create Cocos Scene From Template",
    description: "Create a Cocos Creator scene asset from the local Creator 3.8 built-in default scene templates.",
    inputSchema: createSceneFromTemplateInput
  }, async (input) => textResult(await createSceneFromTemplate(input)));

  server.registerTool("cocos_local_inspect_project", {
    title: "Inspect Cocos Project",
    description: "Inspect a Cocos Creator project root for the files and folders needed before local preview or wechatgame build.",
    inputSchema: projectRootInput
  }, async (input) => textResult(await inspectProject(resolve(input.projectRoot))));

  server.registerTool("cocos_local_create_wechat_build_config", {
    title: "Create WeChat Game Build Config",
    description: "Create a Cocos Creator 3.x command-line build config JSON for the wechatgame platform.",
    inputSchema: createWechatBuildConfigInput
  }, async (input) => textResult(await createWechatBuildConfig(input)));

  server.registerTool("cocos_local_build_wechatgame", {
    title: "Build Cocos WeChat Game",
    description: "Run Cocos Creator command-line build for the wechatgame platform using a configPath or raw build options.",
    inputSchema: buildWechatGameInput
  }, async (input) => textResult(await buildWechatGame(input)));

  server.registerTool("cocos_local_check_wechat_build_output", {
    title: "Check WeChat Game Build Output",
    description: "Check a local Cocos wechatgame build output for required files and package-size budget warnings.",
    inputSchema: checkWechatBuildOutputInput
  }, async (input) => textResult(await checkWechatBuildOutput(input)));

  server.registerTool("cocos_local_open_wechat_devtools", {
    title: "Open WeChat DevTools",
    description: "Open a local Cocos wechatgame build folder in WeChat DevTools through the official CLI. This proves DevTools was invoked, not that runtime gameplay passed.",
    inputSchema: openWechatDevToolsInput
  }, async (input) => textResult(await openWechatDevTools(input)));

  server.registerTool("cocos_local_preview_wechat_devtools", {
    title: "Preview WeChat DevTools Project",
    description: "Run WeChat DevTools CLI preview for a local wechatgame build and optionally write QR/info artifacts.",
    inputSchema: previewWechatDevToolsInput
  }, async (input) => textResult(await previewWechatDevTools(input)));

  server.registerTool("cocos_local_manage_wechat_devtools", {
    title: "Manage WeChat DevTools",
    description: "Clean WeChat DevTools cache, close a project, or quit DevTools locally without uploading or publishing.",
    inputSchema: manageWechatDevToolsInput
  }, async (input) => textResult(await manageWechatDevTools(input)));

  server.registerTool("cocos_local_audit_runtime_package", {
    title: "Audit Cocos Runtime Package",
    description: "Inspect local Cocos/WeChat build artifacts for package budgets, oversized textures/audio, required files, and first-package risk.",
    inputSchema: auditLocalPackageInput
  }, async (input) => textResult(await auditRuntimePackage(input)));

  server.registerTool("cocos_local_collect_runtime_evidence", {
    title: "Collect Local Runtime Evidence",
    description: "Aggregate scene, bridge, build-output, DevTools, screenshot, log, and manual runtime evidence into an explicit vertical-slice verification status.",
    inputSchema: collectRuntimeEvidenceInput
  }, async (input) => textResult(await collectRuntimeEvidence(input)));

  server.registerTool("cocos_local_create_component_script", {
    title: "Create Cocos Component Script",
    description: "Create a Cocos Creator 3.8 TypeScript Component script with ccclass, typed properties, and lifecycle stubs.",
    inputSchema: createComponentScriptInput
  }, async (input) => textResult(await createComponentScript(input)));

  server.registerTool("cocos_local_create_minigame_skeleton", {
    title: "Create Cocos Mini Game Skeleton",
    description: "Create a minimal Cocos Creator 3.8 mini-game runtime skeleton plus a scene assembly blueprint for Editor Bridge application.",
    inputSchema: createMinigameSkeletonInput
  }, async (input) => textResult(await createMinigameSkeleton(input)));

  server.registerTool("cocos_local_create_architecture_skeleton", {
    title: "Create Cocos Architecture Skeleton",
    description: "Create a multi-system Cocos Creator TypeScript architecture skeleton for non-trivial games such as tower defense, including core, data, and gameplay system boundaries.",
    inputSchema: createArchitectureSkeletonInput
  }, async (input) => textResult(await createArchitectureSkeleton(input)));

  server.registerTool("cocos_local_install_editor_bridge", {
    title: "Install Cocos Editor Bridge",
    description: "Install a project-local Cocos Creator 3.x editor extension that exposes a localhost bridge for scene inspection and simple scene operations.",
    inputSchema: installEditorBridgeInput
  }, async (input) => textResult(await installEditorBridge(input)));

  server.registerTool("cocos_local_check_editor_bridge", {
    title: "Check Cocos Editor Bridge",
    description: "Check whether the project-local Codex editor bridge extension files exist and optionally ping its localhost HTTP server.",
    inputSchema: checkEditorBridgeInput
  }, async (input) => textResult(await checkEditorBridge(input)));

  server.registerTool("cocos_local_call_editor_bridge", {
    title: "Call Cocos Editor Bridge",
    description: "Call the localhost HTTP bridge exposed by the Cocos editor extension after it is enabled in Cocos Creator.",
    inputSchema: callEditorBridgeInput
  }, async (input) => textResult(await callEditorBridge(input)));

  server.registerTool("cocos_local_wait_for_editor_bridge", {
    title: "Wait For Cocos Editor Bridge",
    description: "Poll the localhost Codex editor bridge until it responds or a timeout is reached.",
    inputSchema: waitEditorBridgeInput
  }, async (input) => textResult(await waitForEditorBridge(input)));

  server.registerTool("cocos_local_apply_scene_blueprint", {
    title: "Apply Cocos Scene Blueprint",
    description: "Read a generated scene blueprint JSON and apply it to the currently open Cocos scene through the editor bridge.",
    inputSchema: applySceneBlueprintInput
  }, async (input) => textResult(await applySceneBlueprint(input)));

  server.registerTool("cocos_local_open_scene", {
    title: "Open Cocos Scene",
    description: "Open a Cocos Creator scene asset in the running editor through the Codex editor bridge.",
    inputSchema: openSceneInput
  }, async (input) => textResult(await openScene(input)));

  server.registerTool("cocos_local_assign_sprite_frame", {
    title: "Assign SpriteFrame",
    description: "Resolve a Cocos asset path or SpriteFrame UUID and assign it to an existing node's Sprite.spriteFrame property.",
    inputSchema: assignSpriteFrameInput
  }, async (input) => textResult(await assignSpriteFrame(input)));

  server.registerTool("cocos_local_assign_sprite_frame_sequence", {
    title: "Assign SpriteFrame Sequence",
    description: "Resolve ordered frame assets and assign them to a component property such as SpriteFrameAnimator.frames.",
    inputSchema: assignSpriteFrameSequenceInput
  }, async (input) => textResult(await assignSpriteFrameSequence(input)));

  server.registerTool("cocos_local_create_sprite_node", {
    title: "Create Sprite Node",
    description: "Ensure a scene node exists, attach a Sprite component, resolve a SpriteFrame asset, assign it, and optionally save the scene.",
    inputSchema: createSpriteNodeInput
  }, async (input) => textResult(await createSpriteNode(input)));

  server.registerTool("cocos_local_place_sprite_assets", {
    title: "Place Sprite Assets",
    description: "Place multiple generated sprite assets into the active Cocos scene as Sprite nodes in one bridge operation.",
    inputSchema: placeSpriteAssetsInput
  }, async (input) => textResult(await placeSpriteAssets(input)));
}

async function getEnvironment(input: z.infer<typeof getEnvironmentInput>) {
  const creatorCandidates = [
    input.creatorPath,
    process.env.COCOS_CREATOR_PATH,
    defaultMacCreatorPath
  ].filter((value): value is string => Boolean(value));

  const wechatCandidates = [
    input.wechatDevToolsCliPath,
    process.env.WECHAT_DEVTOOLS_CLI_PATH,
    defaultMacWeChatDevToolsPath
  ].filter((value): value is string => Boolean(value));

  const creator = await firstExisting(creatorCandidates);
  const wechatDevToolsCli = await firstExisting(wechatCandidates);
  return {
    creator: {
      path: creator,
      found: Boolean(creator),
      checked: creatorCandidates
    },
    wechatDevToolsCli: {
      path: wechatDevToolsCli,
      found: Boolean(wechatDevToolsCli),
      checked: wechatCandidates
    },
    notes: [
      "Cocos Creator command-line builds use --project <projectRoot> --build \"platform=...\" or --build \"configPath=...\".",
      "WeChat DevTools is only needed for local simulator opening/preview after build; upload/release is intentionally out of scope."
    ]
  };
}

async function createProject(input: z.infer<typeof createProjectInput>) {
  const projectRoot = resolve(input.projectRoot);
  const creatorPath = input.creatorPath ?? process.env.COCOS_CREATOR_PATH ?? defaultMacCreatorPath;
  const templateDir = join(cocosCreatorTemplatesDir(creatorPath), input.templateName);
  if (!await exists(templateDir)) {
    throw new Error(`Cocos Creator template not found: ${templateDir}`);
  }
  if (await exists(projectRoot)) {
    const entries = await safeReaddir(projectRoot);
    if (entries.length > 0 && !input.overwrite) {
      throw new Error(`Project root already exists and is not empty: ${projectRoot}`);
    }
  }

  await mkdir(projectRoot, { recursive: true });
  await cp(templateDir, projectRoot, {
    recursive: true,
    force: input.overwrite,
    errorOnExist: false,
    verbatimSymlinks: true
  });
  await mkdir(join(projectRoot, "assets"), { recursive: true });

  const projectName = sanitizePackageName(input.gameName ?? basename(projectRoot));
  const packageJsonPath = join(projectRoot, "package.json");
  if (await exists(packageJsonPath)) {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as Record<string, unknown>;
    packageJson.name = projectName;
    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  }

  const created: unknown[] = [];
  if (input.createScene) {
    created.push(await createSceneFromTemplate({
      projectRoot,
      creatorPath,
      scenePath: input.scenePath,
      sceneName: "Main",
      template: "2d",
      overwrite: input.overwrite
    }));
  }
  if (input.createSkeleton) {
    created.push(await createMinigameSkeleton({
      projectRoot,
      gameName: input.gameName ?? projectName,
      scriptDir: "assets/scripts/codex",
      blueprintPath: ".codex/cocos/starter-scene-blueprint.json",
      targetScore: 10,
      overwrite: input.overwrite
    }));
  }
  if (input.installEditorBridge) {
    created.push(await installEditorBridge({
      projectRoot,
      extensionName: "codex-editor-bridge",
      port: input.editorBridgePort,
      overwrite: input.overwrite
    }));
  }

  return {
    projectRoot,
    projectName,
    creatorPath,
    templateName: input.templateName,
    templateDir,
    created,
    inspection: await inspectProject(projectRoot),
    nextSteps: [
      "Open the project in Cocos Creator 3.8.8 so assets and scripts are imported.",
      "Open the generated scene, enable the Codex editor bridge, then apply the starter blueprint.",
      "Save the scene and create a wechatgame build config before running a local build."
    ]
  };
}

async function openProject(input: z.infer<typeof openProjectInput>) {
  const projectRoot = resolve(input.projectRoot);
  const creatorPath = input.creatorPath ?? process.env.COCOS_CREATOR_PATH ?? defaultMacCreatorPath;
  const args = ["--project", projectRoot];
  const command = {
    executable: creatorPath,
    args,
    shellCommand: `${JSON.stringify(creatorPath)} ${args.map((arg) => JSON.stringify(arg)).join(" ")}`
  };
  if (!await exists(projectRoot)) {
    throw new Error(`Project root does not exist: ${projectRoot}`);
  }
  if (!await exists(creatorPath)) {
    throw new Error(`Cocos Creator executable not found: ${creatorPath}`);
  }
  if (input.dryRun) {
    return {
      dryRun: true,
      command,
      notes: ["Dry run only; Cocos Creator was not launched."]
    };
  }

  const child = spawn(creatorPath, args, {
    cwd: projectRoot,
    detached: true,
    stdio: "ignore"
  });
  child.unref();

  const result: Record<string, unknown> = {
    dryRun: false,
    projectRoot,
    command,
    pid: child.pid,
    notes: [
      "Cocos Creator was launched detached.",
      "The editor bridge responds only after the project extension is enabled and loaded."
    ]
  };
  if (input.waitForBridge) {
    result.bridge = await waitForEditorBridge({
      port: input.port,
      timeoutMs: input.timeoutMs,
      intervalMs: 1000
    });
  }
  return result;
}

async function createSceneFromTemplate(input: z.infer<typeof createSceneFromTemplateInput>) {
  const projectRoot = resolve(input.projectRoot);
  if (!await exists(projectRoot)) {
    throw new Error(`Project root does not exist: ${projectRoot}`);
  }
  const scenePath = resolveProjectPath(projectRoot, input.scenePath);
  const assetsRoot = resolve(projectRoot, "assets");
  if (!scenePath.startsWith(`${assetsRoot}/`) && scenePath !== assetsRoot) {
    throw new Error(`Scene path must be inside project assets/: ${scenePath}`);
  }
  if (!scenePath.endsWith(".scene")) {
    throw new Error(`Scene path must end with .scene: ${scenePath}`);
  }
  if (!input.overwrite && (await exists(scenePath) || await exists(`${scenePath}.meta`))) {
    throw new Error(`Scene already exists: ${scenePath}`);
  }

  const creatorPath = input.creatorPath ?? process.env.COCOS_CREATOR_PATH ?? defaultMacCreatorPath;
  const template = cocosCreatorDefaultSceneTemplate(creatorPath, input.template);
  if (!await exists(template.scene) || !await exists(template.meta)) {
    throw new Error(`Cocos Creator default scene template is missing for ${input.template}: ${template.scene}`);
  }

  const uuid = randomUUID();
  const sceneName = sanitizeSceneName(input.sceneName || basename(scenePath, ".scene"));
  const sceneJson = JSON.parse(await readFile(template.scene, "utf8")) as Array<Record<string, unknown>>;
  const metaJson = JSON.parse(await readFile(template.meta, "utf8")) as Record<string, unknown>;
  if (sceneJson[0]) sceneJson[0]._name = sceneName;
  if (sceneJson[1]) {
    sceneJson[1]._name = sceneName;
    sceneJson[1]._id = uuid;
  }
  metaJson.uuid = uuid;

  await mkdir(dirname(scenePath), { recursive: true });
  await writeFile(scenePath, `${JSON.stringify(sceneJson, null, 2)}\n`, "utf8");
  await writeFile(`${scenePath}.meta`, `${JSON.stringify(metaJson, null, 2)}\n`, "utf8");

  return {
    projectRoot,
    scenePath,
    sceneMetaPath: `${scenePath}.meta`,
    sceneAssetUrl: toAssetDbUrl(projectRoot, scenePath),
    sceneUuid: uuid,
    sceneName,
    template: input.template,
    notes: [
      "Open or refresh the project in Cocos Creator so the scene asset is imported.",
      "Use this scene UUID as startScene in a build config when needed."
    ]
  };
}

async function inspectProject(projectRoot: string) {
  const checks = await Promise.all([
    exists(projectRoot),
    exists(join(projectRoot, "assets")),
    exists(join(projectRoot, "settings")),
    exists(join(projectRoot, "package.json")),
    exists(join(projectRoot, "project.json")),
    exists(join(projectRoot, "tsconfig.json"))
  ]);
  const buildDir = join(projectRoot, "build");
  const buildExists = await exists(buildDir);
  const buildOutputs = buildExists ? await safeReaddir(buildDir) : [];
  const assets = checks[1] ? await summarizeTopLevel(join(projectRoot, "assets")) : [];
  const warnings: string[] = [];
  if (!checks[0]) warnings.push("Project root does not exist.");
  if (!checks[1]) warnings.push("Missing assets/ directory; this does not look like a normal Cocos Creator project.");
  if (!checks[2]) warnings.push("Missing settings/ directory; build profiles and project settings may be unavailable.");
  if (!checks[3] && !checks[4]) warnings.push("Missing package.json and project.json; project metadata could not be identified.");

  return {
    projectRoot,
    exists: checks[0],
    structure: {
      assets: checks[1],
      settings: checks[2],
      packageJson: checks[3],
      projectJson: checks[4],
      tsconfigJson: checks[5],
      build: buildExists
    },
    assetsTopLevel: assets,
    buildOutputs,
    warnings
  };
}

async function createWechatBuildConfig(input: z.infer<typeof createWechatBuildConfigInput>) {
  const projectRoot = resolve(input.projectRoot);
  const configPath = resolve(projectRoot, input.configPath ?? ".codex/cocos-build/wechatgame.build.json");
  if (!input.overwrite && await exists(configPath)) {
    throw new Error(`Build config already exists: ${configPath}`);
  }

  const startScene = input.startScene ?? (input.startScenePath ? await readSceneUuid(projectRoot, input.startScenePath) : undefined);
  const buildConfig = makeWechatBuildConfig({
    outputName: input.outputName,
    buildPath: input.buildPath,
    gameName: input.gameName,
    debug: input.debug,
    md5Cache: input.md5Cache,
    appid: input.appid,
    packages: input.packages,
    designResolution: input.designResolution,
    startScene,
    scenes: input.scenes
  });

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(buildConfig, null, 2)}\n`, "utf8");

  return {
    configPath,
    projectRoot,
    buildOptions: `configPath=${configPath}`,
    startScene,
    buildConfig,
    notes: [
      "Use cocos_local_build_wechatgame with this configPath to run the local build.",
      "Replace the placeholder appid with a real WeChat Mini Game appid when testing platform APIs."
    ]
  };
}

async function buildWechatGame(input: z.infer<typeof buildWechatGameInput>) {
  const projectRoot = resolve(input.projectRoot);
  const creatorPath = input.creatorPath ?? process.env.COCOS_CREATOR_PATH ?? defaultMacCreatorPath;
  const logDest = input.logDest ? resolve(projectRoot, input.logDest) : resolve(projectRoot, ".codex/cocos-build/wechatgame-build.log");
  const buildOptions = input.buildOptions ?? (input.configPath
    ? `configPath=${resolve(projectRoot, input.configPath)};logDest=${logDest}`
    : `platform=wechatgame;debug=true;logDest=${logDest}`);
  const args = ["--project", projectRoot, "--build", buildOptions];

  const command = {
    executable: creatorPath,
    args,
    cwd: projectRoot,
    logDest,
    shellCommand: `${JSON.stringify(creatorPath)} ${args.map((arg) => JSON.stringify(arg)).join(" ")}`
  };

  if (input.dryRun) {
    return {
      dryRun: true,
      command,
      notes: ["Dry run only; no Cocos build was executed."]
    };
  }

  if (!await exists(creatorPath)) {
    throw new Error(`Cocos Creator executable not found: ${creatorPath}`);
  }
  await mkdir(dirname(logDest), { recursive: true });
  const result = await runProcess(creatorPath, args, projectRoot, input.timeoutMs);
  return {
    dryRun: false,
    command,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
    cocosExitCodeMeaning: {
      "32": "Build failed: invalid build parameters.",
      "34": "Build failed: unexpected build error; inspect build log.",
      "36": "Build success."
    }[String(result.exitCode)] ?? "Unknown or process-level exit code.",
    likelyOutputDir: join(projectRoot, "build", "wechatgame")
  };
}

async function checkWechatBuildOutput(input: z.infer<typeof checkWechatBuildOutputInput>) {
  const projectRoot = resolve(input.projectRoot);
  const outputDir = resolve(projectRoot, input.outputDir ?? "build/wechatgame");
  const outputExists = await exists(outputDir);
  const gameJsonPath = join(outputDir, "game.json");
  const projectConfigPath = join(outputDir, "project.config.json");
  const gameJsonExists = await exists(gameJsonPath);
  const projectConfigExists = await exists(projectConfigPath);
  const files = outputExists ? await listFiles(outputDir) : [];
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const warnings: string[] = [];

  if (!outputExists) warnings.push("Build output directory does not exist.");
  if (outputExists && !gameJsonExists) warnings.push("Missing game.json in wechatgame output.");
  if (outputExists && !projectConfigExists) warnings.push("Missing project.config.json in wechatgame output.");
  if (totalBytes > input.totalPackageLimitBytes) {
    warnings.push(`Total output size ${formatBytes(totalBytes)} exceeds configured total package budget ${formatBytes(input.totalPackageLimitBytes)}.`);
  }
  if (totalBytes > input.mainPackageLimitBytes) {
    warnings.push(`Output size ${formatBytes(totalBytes)} exceeds the configured main-package budget ${formatBytes(input.mainPackageLimitBytes)}. If subpackages are configured, inspect package split sizes separately.`);
  }

  return {
    outputDir,
    exists: outputExists,
    requiredFiles: {
      gameJson: gameJsonExists ? gameJsonPath : null,
      projectConfigJson: projectConfigExists ? projectConfigPath : null
    },
    fileCount: files.length,
    totalBytes,
    totalSize: formatBytes(totalBytes),
    largestFiles: files
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 20),
    budgets: {
      mainPackageLimitBytes: input.mainPackageLimitBytes,
      totalPackageLimitBytes: input.totalPackageLimitBytes
    },
    warnings
  };
}

async function openWechatDevTools(input: z.infer<typeof openWechatDevToolsInput>) {
  const projectRoot = resolve(input.projectRoot);
  const outputDir = resolveProjectPath(projectRoot, input.outputDir);
  const cliPath = input.wechatDevToolsCliPath ?? process.env.WECHAT_DEVTOOLS_CLI_PATH ?? defaultMacWeChatDevToolsPath;
  const outputExists = await exists(outputDir);
  if (input.requireOutput && !outputExists) {
    throw new Error(`WeChat build output does not exist: ${outputDir}`);
  }
  const command = makeWechatDevToolsCommand(cliPath, "open", {
    project: outputDir,
    port: input.port,
    lang: input.lang,
    debug: input.debug,
    disableGpu: input.disableGpu
  });
  if (input.dryRun) {
    return {
      dryRun: true,
      command,
      outputDir,
      outputExists,
      verificationLevel: "command prepared",
      notes: ["Dry run only; WeChat DevTools was not opened."]
    };
  }
  if (!await exists(cliPath)) {
    throw new Error(`WeChat DevTools CLI not found: ${cliPath}`);
  }
  const result = await runProcess(cliPath, command.args, projectRoot, input.timeoutMs);
  return {
    dryRun: false,
    command,
    outputDir,
    outputExists,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
    verificationLevel: result.exitCode === 0 ? "DevTools open command completed" : "DevTools open command failed",
    runtimeVerified: false,
    notes: [
      "A successful open command means WeChat DevTools accepted the project path.",
      "Do not call the vertical slice runtime-verified until simulator behavior, logs, and gameplay evidence are collected."
    ]
  };
}

async function previewWechatDevTools(input: z.infer<typeof previewWechatDevToolsInput>) {
  const projectRoot = resolve(input.projectRoot);
  const outputDir = resolveProjectPath(projectRoot, input.outputDir);
  const cliPath = input.wechatDevToolsCliPath ?? process.env.WECHAT_DEVTOOLS_CLI_PATH ?? defaultMacWeChatDevToolsPath;
  const qrOutput = input.qrOutput ? resolveProjectPath(projectRoot, input.qrOutput) : undefined;
  const infoOutput = input.infoOutput ? resolveProjectPath(projectRoot, input.infoOutput) : undefined;
  const command = makeWechatDevToolsCommand(cliPath, "preview", {
    project: outputDir,
    port: input.port,
    lang: input.lang,
    debug: input.debug,
    disableGpu: input.disableGpu,
    qrFormat: input.qrFormat,
    qrOutput,
    qrSize: input.qrSize,
    infoOutput
  });
  if (qrOutput) await mkdir(dirname(qrOutput), { recursive: true });
  if (infoOutput) await mkdir(dirname(infoOutput), { recursive: true });
  if (input.dryRun) {
    return {
      dryRun: true,
      command,
      outputDir,
      artifacts: { qrOutput, infoOutput },
      notes: ["Dry run only; WeChat DevTools preview was not executed."]
    };
  }
  if (!await exists(cliPath)) {
    throw new Error(`WeChat DevTools CLI not found: ${cliPath}`);
  }
  if (!await exists(outputDir)) {
    throw new Error(`WeChat build output does not exist: ${outputDir}`);
  }
  const result = await runProcess(cliPath, command.args, projectRoot, input.timeoutMs);
  return {
    dryRun: false,
    command,
    outputDir,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
    artifacts: {
      qrOutput: qrOutput ? { path: qrOutput, exists: await exists(qrOutput) } : null,
      infoOutput: infoOutput ? { path: infoOutput, exists: await exists(infoOutput), content: await readTextIfExists(infoOutput) } : null
    },
    runtimeVerified: false,
    notes: [
      "Preview output can produce QR/info artifacts but does not by itself prove simulator gameplay passed.",
      "Pair this with cocos_local_collect_runtime_evidence after observing runtime behavior."
    ]
  };
}

async function manageWechatDevTools(input: z.infer<typeof manageWechatDevToolsInput>) {
  const projectRoot = resolve(input.projectRoot);
  const outputDir = resolveProjectPath(projectRoot, input.outputDir);
  const cliPath = input.wechatDevToolsCliPath ?? process.env.WECHAT_DEVTOOLS_CLI_PATH ?? defaultMacWeChatDevToolsPath;
  const command = makeWechatDevToolsManagementCommand(cliPath, {
    action: input.action,
    project: outputDir,
    cacheType: input.cacheType,
    port: input.port,
    lang: input.lang
  });
  if (input.dryRun) {
    return {
      dryRun: true,
      command,
      notes: ["Dry run only; WeChat DevTools was not changed."]
    };
  }
  if (!await exists(cliPath)) {
    throw new Error(`WeChat DevTools CLI not found: ${cliPath}`);
  }
  const result = await runProcess(cliPath, command.args, projectRoot, input.timeoutMs);
  return {
    dryRun: false,
    command,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr)
  };
}

async function auditRuntimePackage(input: z.infer<typeof auditLocalPackageInput>) {
  const projectRoot = resolve(input.projectRoot);
  const outputDir = resolveProjectPath(projectRoot, input.outputDir);
  const outputAudit = await auditFileTree(outputDir, {
    rootLabel: "buildOutput",
    largeFileWarningBytes: input.largeFileWarningBytes,
    textureDimensionWarning: input.textureDimensionWarning,
    audioWarningBytes: input.audioWarningBytes
  });
  const projectAssetsAudit = input.includeProjectAssets
    ? await auditFileTree(join(projectRoot, "assets"), {
      rootLabel: "projectAssets",
      largeFileWarningBytes: input.largeFileWarningBytes,
      textureDimensionWarning: input.textureDimensionWarning,
      audioWarningBytes: input.audioWarningBytes
    })
    : null;
  const buildOutput = await checkWechatBuildOutput({
    projectRoot,
    outputDir,
    mainPackageLimitBytes: input.mainPackageLimitBytes,
    totalPackageLimitBytes: input.totalPackageLimitBytes
  });
  const settingsPath = join(outputDir, "src", "settings.json");
  const settings = await readJsonIfExists(settingsPath);
  const warnings = [
    ...buildOutput.warnings,
    ...outputAudit.warnings,
    ...(projectAssetsAudit?.warnings ?? [])
  ];
  return {
    projectRoot,
    outputDir,
    buildOutput,
    outputAudit,
    projectAssetsAudit,
    cocosSettings: settings ? summarizeCocosSettings(settings) : null,
    riskSummary: summarizeAuditRisks(outputAudit, projectAssetsAudit),
    warnings,
    notes: [
      "This is a static package audit. It does not measure runtime FPS or draw calls.",
      "Use it before DevTools runtime checks to catch oversized files, missing required output files, and package budget risks."
    ]
  };
}

async function collectRuntimeEvidence(input: z.infer<typeof collectRuntimeEvidenceInput>) {
  const projectRoot = resolve(input.projectRoot);
  const screenshotPath = input.screenshotPath ? resolveProjectPath(projectRoot, input.screenshotPath) : undefined;
  const logPath = input.logPath ? resolveProjectPath(projectRoot, input.logPath) : undefined;
  const sceneMetaPath = `${resolveProjectPath(projectRoot, input.scenePath)}.meta`;
  const sceneUuid = await exists(sceneMetaPath) ? await readSceneUuid(projectRoot, input.scenePath).catch(() => null) : null;
  const evidenceArtifacts = {
    screenshot: screenshotPath ? { path: screenshotPath, exists: await exists(screenshotPath) } : null,
    log: logPath ? { path: logPath, exists: await exists(logPath), tail: tail(await readTextIfExists(logPath) ?? "") } : null
  };
  let bridge: unknown = null;
  if (input.checkEditorBridge) {
    try {
      const health = await callEditorBridge({ port: input.bridgePort, route: "/health", method: "GET", timeoutMs: 3000 });
      const summary = isBridgeHealthOk(health)
        ? await callEditorBridge({ port: input.bridgePort, route: "/scene/summary", method: "POST", body: {}, timeoutMs: 5000 })
        : null;
      bridge = { health, summary };
    } catch (error) {
      bridge = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  const bridgeSummaryOk = Boolean(
    bridge
    && typeof bridge === "object"
    && isBridgeCallSuccessful((bridge as { summary?: unknown }).summary)
  );
  const buildOutput = input.checkBuildOutput
    ? await checkWechatBuildOutput({
      projectRoot,
      outputDir: input.outputDir,
      mainPackageLimitBytes: 4 * 1024 * 1024,
      totalPackageLimitBytes: 20 * 1024 * 1024
    })
    : null;
  const gates = {
    launch: input.evidence.launch,
    firstInput: input.evidence.firstInput,
    coreLoop: input.evidence.coreLoop,
    resultOrFailure: input.evidence.resultOrFailure,
    restart: input.evidence.restart,
    consoleReviewed: input.evidence.consoleReviewed,
    screenshotOrEquivalent: Boolean(evidenceArtifacts.screenshot?.exists || bridgeSummaryOk),
    runtimeUsed: input.runtime !== "not-run",
    runtimeVerified: input.runtimeStatus === "verified"
  };
  const missing = Object.entries(gates)
    .filter(([, passed]) => !passed)
    .map(([gate]) => gate);
  const verticalSliceVerified = missing.length === 0;
  return {
    projectRoot,
    scene: {
      scenePath: input.scenePath,
      sceneMetaPath,
      sceneMetaExists: await exists(sceneMetaPath),
      sceneUuid
    },
    runtime: {
      runtime: input.runtime,
      runtimeStatus: input.runtimeStatus,
      vocabulary: input.runtimeStatus === "not-run"
        ? "local build may be verified; runtime not run"
        : input.runtimeStatus === "opened"
          ? "runtime opened; gameplay not fully verified"
          : "runtime verified by provided evidence"
    },
    bridge,
    buildOutput,
    evidenceArtifacts,
    gates,
    missing,
    verticalSliceVerified,
    notes: verticalSliceVerified
      ? ["All configured vertical-slice evidence gates passed."]
      : [
        "Do not describe the vertical slice as verified until all gates pass.",
        "A successful build or DevTools open command is not enough without first input, core loop, result/failure, restart, and log evidence."
      ]
  };
}

async function createComponentScript(input: z.infer<typeof createComponentScriptInput>) {
  const projectRoot = resolve(input.projectRoot);
  if (!await exists(projectRoot)) {
    throw new Error(`Project root does not exist: ${projectRoot}`);
  }
  const className = sanitizeClassName(input.className);
  const relativeScriptPath = input.scriptPath ?? join("assets", "scripts", `${className}.ts`);
  const scriptPath = resolve(projectRoot, relativeScriptPath);
  const assetsRoot = resolve(projectRoot, "assets");
  if (!scriptPath.startsWith(`${assetsRoot}/`) && scriptPath !== assetsRoot) {
    throw new Error(`Script path must be inside project assets/: ${scriptPath}`);
  }
  if (!input.overwrite && await exists(scriptPath)) {
    throw new Error(`Component script already exists: ${scriptPath}`);
  }
  await mkdir(dirname(scriptPath), { recursive: true });
  const content = makeComponentScript({
    className,
    description: input.description,
    properties: input.properties,
    lifecycle: input.lifecycle
  });
  await writeFile(scriptPath, content, "utf8");
  return {
    projectRoot,
    scriptPath,
    assetUrl: toAssetDbUrl(projectRoot, scriptPath),
    className,
    notes: [
      "Open or refresh the project in Cocos Creator so the script is imported and compiled.",
      `After import, attach the component by class name "${className}" through the editor or the Codex editor bridge.`
    ]
  };
}

async function createMinigameSkeleton(input: z.infer<typeof createMinigameSkeletonInput>) {
  const projectRoot = resolve(input.projectRoot);
  if (!await exists(projectRoot)) {
    throw new Error(`Project root does not exist: ${projectRoot}`);
  }
  const scriptDir = normalizeProjectRelativePath(input.scriptDir);
  const blueprintPath = normalizeProjectRelativePath(input.blueprintPath);
  const assetsRoot = resolve(projectRoot, "assets");
  const scriptRoot = resolve(projectRoot, scriptDir);
  if (!scriptRoot.startsWith(`${assetsRoot}/`) && scriptRoot !== assetsRoot) {
    throw new Error(`scriptDir must be inside project assets/: ${scriptDir}`);
  }

  const files = starterSkeletonFiles({
    gameName: input.gameName,
    scriptDir,
    blueprintPath,
    targetScore: input.targetScore
  });
  const written: string[] = [];
  for (const file of files) {
    const absolutePath = resolveProjectPath(projectRoot, file.path);
    if (!input.overwrite && await exists(absolutePath)) {
      throw new Error(`Skeleton file already exists: ${absolutePath}`);
    }
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.content, "utf8");
    written.push(absolutePath);
  }

  return {
    projectRoot,
    gameName: input.gameName,
    files: written,
    blueprintPath: resolveProjectPath(projectRoot, blueprintPath),
    blueprintApplyRoute: "POST /scene/apply-blueprint",
    nextSteps: [
      "Open or refresh the project in Cocos Creator so generated scripts are imported and compiled.",
      "Install or enable the Codex editor bridge if it is not already running.",
      "Open the target scene, then call /scene/apply-blueprint with the generated blueprint JSON body.",
      "Call /scene/save after the blueprint applies successfully, then create a wechatgame build config."
    ]
  };
}

async function createArchitectureSkeleton(input: z.infer<typeof createArchitectureSkeletonInput>) {
  const projectRoot = resolve(input.projectRoot);
  if (!await exists(projectRoot)) {
    throw new Error(`Project root does not exist: ${projectRoot}`);
  }
  const scriptDir = normalizeProjectRelativePath(input.scriptDir);
  const planPath = normalizeProjectRelativePath(input.planPath);
  const assetsRoot = resolve(projectRoot, "assets");
  const scriptRoot = resolve(projectRoot, scriptDir);
  if (!scriptRoot.startsWith(`${assetsRoot}/`) && scriptRoot !== assetsRoot) {
    throw new Error(`scriptDir must be inside project assets/: ${scriptDir}`);
  }

  const files = architectureSkeletonFiles({
    gameName: input.gameName,
    preset: input.preset,
    scriptDir,
    planPath
  });
  const written: string[] = [];
  for (const file of files) {
    const absolutePath = resolveProjectPath(projectRoot, file.path);
    if (!input.overwrite && await exists(absolutePath)) {
      throw new Error(`Architecture skeleton file already exists: ${absolutePath}`);
    }
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.content, "utf8");
    written.push(absolutePath);
  }

  return {
    projectRoot,
    gameName: input.gameName,
    preset: input.preset,
    files: written,
    planPath: resolveProjectPath(projectRoot, planPath),
    notes: [
      "This is an optional system-boundary starting point, not a complete game implementation or mandatory architecture.",
      "Prune, merge, or rename generated systems according to the actual slice complexity.",
      "Use cocos_local_create_component_script for scene-facing adapters when a Cocos Component needs to host or bridge these systems."
    ]
  };
}

async function installEditorBridge(input: z.infer<typeof installEditorBridgeInput>) {
  const projectRoot = resolve(input.projectRoot);
  const extensionDir = resolve(projectRoot, "extensions", input.extensionName);
  const files = editorBridgeFiles(input.extensionName, input.port);

  if (!await exists(projectRoot)) {
    throw new Error(`Project root does not exist: ${projectRoot}`);
  }
  if (!input.overwrite && await exists(extensionDir)) {
    throw new Error(`Editor bridge already exists: ${extensionDir}`);
  }

  await mkdir(extensionDir, { recursive: true });
  for (const file of files) {
    const path = join(extensionDir, file.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.content, "utf8");
  }

  return {
    projectRoot,
    extensionDir,
    extensionName: input.extensionName,
    port: input.port,
    files: files.map((file) => join(extensionDir, file.path)),
    nextSteps: [
      "Open the project in Cocos Creator 3.8.x.",
      "Open Extension -> Extension Manager -> Project, refresh if needed, and enable Codex Editor Bridge.",
      `After enabling, call cocos_local_check_editor_bridge with port ${input.port} to confirm the localhost bridge is running.`,
      "Use cocos_local_call_editor_bridge route /scene/summary after a scene is open to inspect the current scene tree."
    ],
    references: [
      "Cocos Creator project extensions live under <project>/extensions.",
      "The bridge uses Cocos extension messages and scene scripts so engine APIs run in the scene process."
    ]
  };
}

async function checkEditorBridge(input: z.infer<typeof checkEditorBridgeInput>) {
  const projectRoot = resolve(input.projectRoot);
  const extensionDir = resolve(projectRoot, "extensions", input.extensionName);
  const expected = ["package.json", "browser.js", "scene.js", "bridge-config.json"];
  const fileStatus = await Promise.all(expected.map(async (file) => ({
    file: join(extensionDir, file),
    exists: await exists(join(extensionDir, file))
  })));
  const warnings = fileStatus.filter((item) => !item.exists).map((item) => `Missing ${basename(item.file)}.`);
  let http: unknown = null;
  if (input.pingHttp) {
    try {
      http = await callEditorBridge({ port: input.port, route: "/health", method: "GET", timeoutMs: 3000 });
    } catch (error) {
      warnings.push(`Bridge HTTP ping failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return {
    projectRoot,
    extensionDir,
    extensionExists: await exists(extensionDir),
    files: fileStatus,
    http,
    warnings,
    notes: [
      "The extension must be enabled in Cocos Creator before the HTTP bridge can respond.",
      "If files exist but HTTP ping fails, open Cocos Creator Extension Manager and enable or refresh the project extension."
    ]
  };
}

async function callEditorBridge(input: z.infer<typeof callEditorBridgeInput>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await fetch(`http://127.0.0.1:${input.port}${input.route}`, {
      method: input.method,
      headers: input.method === "POST" ? { "content-type": "application/json" } : undefined,
      body: input.method === "POST" ? JSON.stringify(input.body ?? {}) : undefined,
      signal: controller.signal
    });
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      // Keep raw text.
    }
    return {
      ok: response.ok,
      status: response.status,
      route: input.route,
      response: parsed
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForEditorBridge(input: z.infer<typeof waitEditorBridgeInput>) {
  const startedAt = Date.now();
  const attempts: Array<{ elapsedMs: number; ok: boolean; error?: string; status?: number }> = [];
  let last: unknown = null;
  while (Date.now() - startedAt <= input.timeoutMs) {
    try {
      const response = await callEditorBridge({
        port: input.port,
        route: "/health",
        method: "GET",
        timeoutMs: Math.min(5000, Math.max(1000, input.intervalMs))
      });
      last = response;
      const ok = isBridgeHealthOk(response);
      attempts.push({
        elapsedMs: Date.now() - startedAt,
        ok,
        status: typeof response.status === "number" ? response.status : undefined
      });
      if (ok) {
        return {
          ok: true,
          port: input.port,
          elapsedMs: Date.now() - startedAt,
          attempts: attempts.length,
          response
        };
      }
    } catch (error) {
      attempts.push({
        elapsedMs: Date.now() - startedAt,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    await delay(input.intervalMs);
  }
  return {
    ok: false,
    port: input.port,
    elapsedMs: Date.now() - startedAt,
    attempts: attempts.length,
    last,
    attemptTail: attempts.slice(-10),
    notes: [
      "Open Cocos Creator, refresh project extensions, and enable Codex Editor Bridge if this timed out."
    ]
  };
}

async function applySceneBlueprint(input: z.infer<typeof applySceneBlueprintInput>) {
  const projectRoot = resolve(input.projectRoot);
  const blueprintPath = resolveProjectPath(projectRoot, input.blueprintPath);
  if (!await exists(blueprintPath)) {
    throw new Error(`Scene blueprint does not exist: ${blueprintPath}`);
  }
  let opened: unknown = null;
  if (input.openScene) {
    opened = await openScene({
      projectRoot,
      scenePath: input.scenePath,
      port: input.port,
      timeoutMs: input.timeoutMs
    });
    if (input.openSceneDelayMs > 0) {
      await delay(input.openSceneDelayMs);
    }
  }
  const blueprint = JSON.parse(await readFile(blueprintPath, "utf8")) as Record<string, unknown>;
  const apply = await callEditorBridge({
    port: input.port,
    route: "/scene/apply-blueprint",
    method: "POST",
    body: { blueprint },
    timeoutMs: input.timeoutMs
  });
  let save: unknown = null;
  if (input.saveScene && isBridgeCallSuccessful(apply)) {
    save = await callEditorBridge({
      port: input.port,
      route: "/scene/save",
      method: "POST",
      body: {},
      timeoutMs: input.timeoutMs
    });
  }
  return {
    projectRoot,
    blueprintPath,
    opened,
    applied: apply,
    saved: save,
    notes: [
      "This requires an active scene in Cocos Creator and imported custom scripts.",
      "If component attachment reports unknown custom types, wait for script compilation and retry."
    ]
  };
}

async function openScene(input: z.infer<typeof openSceneInput>) {
  const projectRoot = resolve(input.projectRoot);
  const sceneUuid = input.sceneUuid ?? await readSceneUuid(projectRoot, input.scenePath);
  const opened = await callEditorBridge({
    port: input.port,
    route: "/scene/open-scene",
    method: "POST",
    body: { sceneUuid },
    timeoutMs: input.timeoutMs
  });
  return {
    projectRoot,
    scenePath: input.scenePath,
    sceneUuid,
    opened,
    notes: [
      "If the scene remains inactive immediately after opening, wait briefly and call /scene/summary before applying a blueprint."
    ]
  };
}

async function assignSpriteFrame(input: z.infer<typeof assignSpriteFrameInput>) {
  const projectRoot = resolve(input.projectRoot);
  let opened: unknown = null;
  if (input.openScene) {
    opened = await openScene({
      projectRoot,
      scenePath: input.scenePath,
      port: input.port,
      timeoutMs: input.timeoutMs
    });
  }
  if (input.addSpriteComponent) {
    const addComponent = await callEditorBridge({
      port: input.port,
      route: "/scene/add-component",
      method: "POST",
      body: {
        path: input.nodePath,
        type: "Sprite"
      },
      timeoutMs: input.timeoutMs
    });
    if (!isBridgeCallSuccessful(addComponent)) {
      return {
        projectRoot,
        nodePath: input.nodePath,
        opened,
        addedSpriteComponent: addComponent,
        assigned: null,
        saved: null,
        ok: false,
        notes: [
          "Could not add or find a Sprite component before assignment.",
          "Make sure the scene is open and the node path exists."
        ]
      };
    }
  }
  const resolved = await resolveSpriteFrameAsset({
    projectRoot,
    assetPath: input.assetPath,
    port: input.port,
    timeoutMs: input.timeoutMs
  });
  const assigned = await callEditorBridge({
    port: input.port,
    route: "/scene/set-component-asset-property",
    method: "POST",
    body: {
      nodePath: input.nodePath,
      componentType: "Sprite",
      property: "spriteFrame",
      assetUuid: resolved.spriteFrameUuid
    },
    timeoutMs: input.timeoutMs
  });
  let saved: unknown = null;
  if (input.saveScene && isBridgeCallSuccessful(assigned)) {
    saved = await saveSceneThroughBridge(input.port, input.timeoutMs);
  }
  return {
    projectRoot,
    nodePath: input.nodePath,
    assetPath: input.assetPath,
    opened,
    resolvedAsset: resolved,
    assigned,
    saved,
    ok: isBridgeCallSuccessful(assigned),
    notes: [
      "This tool assigns a SpriteFrame to Sprite.spriteFrame. If the asset was just generated, wait for Cocos AssetDB import before retrying."
    ]
  };
}

async function assignSpriteFrameSequence(input: z.infer<typeof assignSpriteFrameSequenceInput>) {
  const projectRoot = resolve(input.projectRoot);
  let opened: unknown = null;
  if (input.openScene) {
    opened = await openScene({
      projectRoot,
      scenePath: input.scenePath,
      port: input.port,
      timeoutMs: input.timeoutMs
    });
  }
  let addedComponent: unknown = null;
  if (input.addComponent) {
    addedComponent = await callEditorBridge({
      port: input.port,
      route: "/scene/add-component",
      method: "POST",
      body: {
        path: input.nodePath,
        type: input.componentType
      },
      timeoutMs: input.timeoutMs
    });
    if (!isBridgeCallSuccessful(addedComponent)) {
      return {
        projectRoot,
        nodePath: input.nodePath,
        opened,
        addedComponent,
        resolvedFrames: [],
        assigned: null,
        saved: null,
        ok: false,
        notes: [
          `Could not add or find component ${input.componentType}.`,
          "Make sure the component script has been imported and compiled by Cocos Creator."
        ]
      };
    }
  }

  const resolvedFrames = [];
  for (const assetPath of input.assetPaths) {
    resolvedFrames.push(await resolveSpriteFrameAsset({
      projectRoot,
      assetPath,
      port: input.port,
      timeoutMs: input.timeoutMs
    }));
  }
  const assigned = await callEditorBridge({
    port: input.port,
    route: "/scene/set-component-asset-array-property",
    method: "POST",
    body: {
      nodePath: input.nodePath,
      componentType: input.componentType,
      property: input.property,
      assetUuids: resolvedFrames.map((frame) => frame.spriteFrameUuid)
    },
    timeoutMs: input.timeoutMs
  });
  let saved: unknown = null;
  if (input.saveScene && isBridgeCallSuccessful(assigned)) {
    saved = await saveSceneThroughBridge(input.port, input.timeoutMs);
  }
  return {
    projectRoot,
    nodePath: input.nodePath,
    componentType: input.componentType,
    property: input.property,
    opened,
    addedComponent,
    resolvedFrames,
    assigned,
    saved,
    ok: isBridgeCallSuccessful(assigned),
    notes: [
      "This assigns ordered SpriteFrame assets to an array property. The target component should declare @property([SpriteFrame]).",
      "If AssetDB cannot resolve fresh frame PNGs, wait for import and retry."
    ]
  };
}

async function createSpriteNode(input: z.infer<typeof createSpriteNodeInput>) {
  const result = await placeSpriteAssets({
    projectRoot: input.projectRoot,
    scenePath: input.scenePath,
    openScene: input.openScene,
    openSceneDelayMs: input.openSceneDelayMs,
    sprites: [input.sprite],
    port: input.port,
    timeoutMs: input.timeoutMs,
    saveScene: input.saveScene
  });
  return {
    ...result,
    sprite: result.sprites[0] ?? null
  };
}

async function placeSpriteAssets(input: z.infer<typeof placeSpriteAssetsInput>) {
  const projectRoot = resolve(input.projectRoot);
  let opened: unknown = null;
  if (input.openScene) {
    opened = await openScene({
      projectRoot,
      scenePath: input.scenePath,
      port: input.port,
      timeoutMs: input.timeoutMs
    });
    if (input.openSceneDelayMs > 0) {
      await delay(input.openSceneDelayMs);
    }
  }

  const resolvedSprites = [];
  const nodes = [];
  for (const sprite of input.sprites) {
    const resolved = await resolveSpriteFrameAsset({
      projectRoot,
      assetPath: sprite.assetPath,
      port: input.port,
      timeoutMs: input.timeoutMs
    });
    const nodePath = sprite.nodePath ?? makeChildNodePath(sprite.parentPath, sprite.name ?? inferNodeNameFromAsset(sprite.assetPath));
    resolvedSprites.push({
      ...sprite,
      nodePath,
      resolvedAsset: resolved
    });
    nodes.push({
      path: nodePath,
      active: sprite.active,
      position: sprite.position,
      scale: sprite.scale,
      components: [
        {
          type: "Sprite",
          assetProperties: {
            spriteFrame: resolved.spriteFrameUuid
          }
        }
      ]
    });
  }

  const blueprint = {
    name: "Placed Sprite Assets",
    applyWith: "POST /scene/apply-blueprint",
    nodes
  };
  const applied = await callEditorBridge({
    port: input.port,
    route: "/scene/apply-blueprint",
    method: "POST",
    body: { blueprint },
    timeoutMs: input.timeoutMs
  });
  let saved: unknown = null;
  if (input.saveScene && isBridgeCallSuccessful(applied)) {
    saved = await saveSceneThroughBridge(input.port, input.timeoutMs);
  }

  return {
    projectRoot,
    scenePath: input.scenePath,
    opened,
    sprites: resolvedSprites,
    blueprint,
    applied,
    saved,
    ok: isBridgeCallSuccessful(applied),
    notes: [
      "This creates or reuses scene nodes and assigns generated assets as Sprite.spriteFrame references.",
      "If AssetDB cannot resolve a fresh PNG, wait for Cocos Creator to finish importing assets and retry."
    ]
  };
}

async function saveSceneThroughBridge(port: number, timeoutMs: number) {
  return callEditorBridge({
    port,
    route: "/scene/save",
    method: "POST",
    body: {},
    timeoutMs
  });
}

async function resolveSpriteFrameAsset(input: {
  projectRoot: string;
  assetPath: string;
  port: number;
  timeoutMs: number;
}) {
  if (looksLikeUuid(input.assetPath)) {
    return {
      input: input.assetPath,
      spriteFrameUuid: input.assetPath,
      assetUrl: null,
      assetInfo: null,
      warnings: ["Input was treated as a SpriteFrame UUID without AssetDB verification."]
    };
  }

  const assetUrl = normalizeAssetReference(input.projectRoot, input.assetPath);
  const assetInfoResponse = await callEditorBridge({
    port: input.port,
    route: "/assets/info",
    method: "POST",
    body: { urlOrUuid: assetUrl },
    timeoutMs: input.timeoutMs
  });
  if (!isBridgeCallSuccessful(assetInfoResponse)) {
    throw new Error(`AssetDB could not resolve ${assetUrl}: ${JSON.stringify(assetInfoResponse)}`);
  }
  const assetInfo = extractEditorResult(assetInfoResponse);
  const spriteFrameUuid = findSpriteFrameUuid(assetInfo);
  const warnings: string[] = [];
  if (!spriteFrameUuid) {
    const fallbackUuid = findFirstUuid(assetInfo);
    if (!fallbackUuid) {
      throw new Error(`AssetDB info did not include a SpriteFrame UUID for ${assetUrl}.`);
    }
    warnings.push("Could not identify a SpriteFrame sub-asset explicitly; falling back to the first UUID in AssetDB info.");
    return {
      input: input.assetPath,
      assetUrl,
      spriteFrameUuid: fallbackUuid,
      assetInfo,
      warnings
    };
  }
  return {
    input: input.assetPath,
    assetUrl,
    spriteFrameUuid,
    assetInfo,
    warnings
  };
}

async function readSceneUuid(projectRoot: string, scenePath: string): Promise<string> {
  const absoluteScenePath = resolveProjectPath(projectRoot, scenePath);
  const metaPath = `${absoluteScenePath}.meta`;
  if (!await exists(metaPath)) {
    throw new Error(`Scene meta file does not exist: ${metaPath}`);
  }
  const meta = JSON.parse(await readFile(metaPath, "utf8")) as { uuid?: unknown };
  if (typeof meta.uuid !== "string" || !meta.uuid) {
    throw new Error(`Scene meta file does not contain a uuid: ${metaPath}`);
  }
  return meta.uuid;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function firstExisting(paths: string[]): Promise<string | null> {
  for (const path of paths) {
    if (await exists(path)) return path;
  }
  return null;
}

async function safeReaddir(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch {
    return [];
  }
}

async function summarizeTopLevel(path: string): Promise<Array<{ name: string; kind: "file" | "dir" | "other" }>> {
  const entries = await readdir(path, { withFileTypes: true });
  return entries.slice(0, 80).map((entry) => ({
    name: entry.name,
    kind: entry.isDirectory() ? "dir" : entry.isFile() ? "file" : "other"
  }));
}

async function listFiles(root: string): Promise<Array<{ path: string; bytes: number }>> {
  const output: Array<{ path: string; bytes: number }> = [];
  await walk(root, output);
  return output;
}

async function walk(current: string, output: Array<{ path: string; bytes: number }>): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      await walk(path, output);
    } else if (entry.isFile()) {
      const info = await stat(path);
      output.push({ path, bytes: info.size });
    }
  }
}

function runProcess(command: string, args: string[], cwd: string, timeoutMs: number): Promise<{
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolveProcess) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolveProcess({ exitCode: null, timedOut, stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolveProcess({ exitCode, timedOut, stdout, stderr });
    });
  });
}

function tail(value: string, maxLength = 6000): string {
  return value.length <= maxLength ? value : value.slice(value.length - maxLength);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

type WeChatCommandOptions = {
  project: string;
  port?: number;
  lang?: "en" | "zh";
  debug?: boolean;
  disableGpu?: boolean;
  qrFormat?: "terminal" | "image" | "base64";
  qrOutput?: string;
  qrSize?: string;
  infoOutput?: string;
};

export function makeWechatBuildConfig(input: {
  outputName: string;
  buildPath: string;
  gameName: string;
  debug: boolean;
  md5Cache: boolean;
  appid: string;
  packages?: Record<string, unknown>;
  designResolution?: z.infer<typeof designResolutionInput>;
  startScene?: string;
  scenes?: unknown[];
}): Record<string, unknown> {
  const buildConfig: Record<string, unknown> = {
    taskName: input.outputName,
    platform: "wechatgame",
    buildPath: input.buildPath,
    outputName: input.outputName,
    name: input.gameName,
    debug: input.debug,
    md5Cache: input.md5Cache,
    packages: {
      wechatgame: {
        appid: input.appid,
        ...(input.packages ?? {})
      }
    }
  };

  if (input.designResolution) buildConfig.designResolution = input.designResolution;
  if (input.startScene) buildConfig.startScene = input.startScene;
  if (input.scenes) buildConfig.scenes = input.scenes;

  return buildConfig;
}

export function makeWechatDevToolsCommand(executable: string, command: "open" | "preview", options: WeChatCommandOptions) {
  const args = [command, "--project", options.project];
  if (options.port) args.push("--port", String(options.port));
  if (options.lang) args.push("--lang", options.lang);
  if (options.debug) args.push("--debug");
  if (options.disableGpu) args.push("--disable-gpu");
  if (command === "preview") {
    args.push("--qr-format", options.qrFormat ?? "terminal");
    if (options.qrOutput) args.push("--qr-output", options.qrOutput);
    if (options.qrSize) args.push("--qr-size", options.qrSize);
    if (options.infoOutput) args.push("--info-output", options.infoOutput);
  }
  return {
    executable,
    args,
    shellCommand: `${JSON.stringify(executable)} ${args.map((arg) => JSON.stringify(arg)).join(" ")}`
  };
}

export function makeWechatDevToolsManagementCommand(executable: string, options: {
  action: "clean-cache" | "close" | "quit";
  project: string;
  cacheType?: "storage" | "file" | "compile" | "auth" | "network" | "session" | "all";
  port?: number;
  lang?: "en" | "zh";
}) {
  const args = options.action === "clean-cache"
    ? ["cache", "--clean", options.cacheType ?? "compile", "--project", options.project]
    : options.action === "close"
      ? ["close", "--project", options.project]
      : ["quit"];
  if (options.port) args.push("--port", String(options.port));
  if (options.lang) args.push("--lang", options.lang);
  return {
    executable,
    args,
    shellCommand: `${JSON.stringify(executable)} ${args.map((arg) => JSON.stringify(arg)).join(" ")}`
  };
}

async function auditFileTree(root: string, options: {
  rootLabel: string;
  largeFileWarningBytes: number;
  textureDimensionWarning: number;
  audioWarningBytes: number;
}) {
  if (!await exists(root)) {
    return {
      root,
      rootLabel: options.rootLabel,
      exists: false,
      totalBytes: 0,
      totalSize: "0 B",
      fileCount: 0,
      filesByKind: {},
      largestFiles: [],
      textureFindings: [],
      audioFindings: [],
      warnings: [`${options.rootLabel} directory does not exist: ${root}`]
    };
  }
  const files = await listFiles(root);
  const inspected = await Promise.all(files.map((file) => inspectRuntimeFile(root, file)));
  const filesByKind = inspected.reduce<Record<string, number>>((acc, file) => {
    acc[file.kind] = (acc[file.kind] ?? 0) + 1;
    return acc;
  }, {});
  const totalBytes = inspected.reduce((sum, file) => sum + file.bytes, 0);
  const textureFindings = inspected.filter((file) => file.kind === "texture" && file.texture);
  const audioFindings = inspected.filter((file) => file.kind === "audio" && file.audio);
  const warnings: string[] = [];
  for (const file of inspected) {
    if (file.bytes >= options.largeFileWarningBytes) {
      warnings.push(`${options.rootLabel}: large file ${file.relativePath} is ${formatBytes(file.bytes)}.`);
    }
    if (file.kind === "texture" && file.texture) {
      if (file.texture.width >= options.textureDimensionWarning || file.texture.height >= options.textureDimensionWarning) {
        warnings.push(`${options.rootLabel}: large texture ${file.relativePath} is ${file.texture.width}x${file.texture.height}.`);
      }
    }
    if (file.kind === "audio" && file.bytes >= options.audioWarningBytes) {
      warnings.push(`${options.rootLabel}: large audio ${file.relativePath} is ${formatBytes(file.bytes)}.`);
    }
  }
  return {
    root,
    rootLabel: options.rootLabel,
    exists: true,
    totalBytes,
    totalSize: formatBytes(totalBytes),
    fileCount: inspected.length,
    filesByKind,
    largestFiles: inspected
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 25),
    textureFindings,
    audioFindings,
    warnings
  };
}

async function inspectRuntimeFile(root: string, file: { path: string; bytes: number }) {
  const extension = extname(file.path).toLowerCase();
  const kind = classifyRuntimeFile(extension);
  return {
    path: file.path,
    relativePath: relative(root, file.path),
    bytes: file.bytes,
    size: formatBytes(file.bytes),
    extension,
    kind,
    texture: kind === "texture" ? await readTextureInfo(file.path, extension) : null,
    audio: kind === "audio" ? await readAudioInfo(file.path, extension) : null
  };
}

function classifyRuntimeFile(extension: string): "texture" | "audio" | "script" | "json" | "asset" | "other" {
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) return "texture";
  if ([".wav", ".mp3", ".ogg", ".m4a", ".aac"].includes(extension)) return "audio";
  if ([".js", ".wasm"].includes(extension)) return "script";
  if ([".json"].includes(extension)) return "json";
  if ([".bin", ".cconb", ".ccon", ".plist"].includes(extension)) return "asset";
  return "other";
}

async function readTextureInfo(path: string, extension: string) {
  if (extension !== ".png") return null;
  const bytes = await readFile(path);
  if (bytes.length < 24) return null;
  const signature = bytes.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") return null;
  return {
    format: "png",
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

async function readAudioInfo(path: string, extension: string) {
  if (extension !== ".wav") return null;
  const bytes = await readFile(path);
  if (bytes.length < 44 || bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WAVE") {
    return null;
  }
  const channels = bytes.readUInt16LE(22);
  const sampleRate = bytes.readUInt32LE(24);
  const byteRate = bytes.readUInt32LE(28);
  const dataIndex = bytes.indexOf("data", 12, "ascii");
  const dataBytes = dataIndex >= 0 && dataIndex + 8 <= bytes.length ? bytes.readUInt32LE(dataIndex + 4) : Math.max(0, bytes.length - 44);
  return {
    format: "wav",
    channels,
    sampleRate,
    durationSeconds: byteRate > 0 ? Number((dataBytes / byteRate).toFixed(3)) : null
  };
}

async function readTextIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function readJsonIfExists(path: string): Promise<unknown | null> {
  const text = await readTextIfExists(path);
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function summarizeCocosSettings(settings: unknown) {
  if (!settings || typeof settings !== "object") return null;
  const value = settings as {
    CocosEngine?: unknown;
    launch?: { launchScene?: unknown };
    assets?: { remoteBundles?: unknown; subpackages?: unknown; preloadBundles?: unknown };
    screen?: unknown;
  };
  return {
    engine: value.CocosEngine ?? null,
    launchScene: value.launch?.launchScene ?? null,
    remoteBundles: value.assets?.remoteBundles ?? null,
    subpackages: value.assets?.subpackages ?? null,
    preloadBundles: value.assets?.preloadBundles ?? null,
    screen: value.screen ?? null
  };
}

function summarizeAuditRisks(...audits: Array<Awaited<ReturnType<typeof auditFileTree>> | null>) {
  const active = audits.filter((audit): audit is Awaited<ReturnType<typeof auditFileTree>> => Boolean(audit));
  return {
    totalWarnings: active.reduce((sum, audit) => sum + audit.warnings.length, 0),
    totalBytes: active.reduce((sum, audit) => sum + audit.totalBytes, 0),
    totalSize: formatBytes(active.reduce((sum, audit) => sum + audit.totalBytes, 0)),
    largestFiles: active.flatMap((audit) => audit.largestFiles)
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10)
  };
}

function isBridgeHealthOk(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const outer = value as { ok?: unknown; response?: unknown };
  if (outer.ok !== true || !outer.response || typeof outer.response !== "object") return false;
  return (outer.response as { ok?: unknown }).ok === true;
}

function isBridgeCallSuccessful(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const outer = value as { ok?: unknown; response?: unknown };
  if (outer.ok !== true) return false;
  if (!outer.response || typeof outer.response !== "object") return true;
  const inner = outer.response as { ok?: unknown };
  return inner.ok !== false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

export function editorBridgeFiles(extensionName: string, port: number): Array<{ path: string; content: string }> {
  return [
    {
      path: "package.json",
      content: `${JSON.stringify({
        name: extensionName,
        package_version: 2,
        version: "0.1.0",
        title: "Codex Editor Bridge",
        description: "Localhost bridge for Codex-assisted Cocos Creator scene inspection and simple scene operations.",
        author: "Codex",
        editor: ">=3.8.0",
        main: "./browser.js",
        contributions: {
          menu: [
            {
              path: "Developer/Codex Editor Bridge/Print Status",
              message: "print-status"
            }
          ],
          scene: {
            script: "./scene.js"
          },
          messages: {
            "print-status": {
              public: true,
              description: "Print Codex Editor Bridge status.",
              methods: ["printStatus"]
            },
            "start-server": {
              public: true,
              description: "Start the Codex Editor Bridge HTTP server.",
              methods: ["startServer"]
            },
            "stop-server": {
              public: true,
              description: "Stop the Codex Editor Bridge HTTP server.",
              methods: ["stopServer"]
            },
            "scene-summary": {
              public: true,
              description: "Return a summary of the currently open scene.",
              methods: ["sceneSummary"]
            }
          }
        }
      }, null, 2)}\n`
    },
    {
      path: "bridge-config.json",
      content: `${JSON.stringify({ port }, null, 2)}\n`
    },
    {
      path: "browser.js",
      content: editorBridgeBrowserJs()
    },
    {
      path: "scene.js",
      content: editorBridgeSceneJs()
    }
  ];
}

function editorBridgeBrowserJs(): string {
  return String.raw`'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const packageJSON = require('./package.json');

let server = null;
let currentPort = null;

exports.load = function load() {
  startServer().catch((error) => console.error('[codex-editor-bridge] failed to start', error));
};

exports.unload = function unload() {
  stopServer();
};

exports.methods = {
  printStatus() {
    console.log('[codex-editor-bridge]', { running: Boolean(server), port: currentPort });
    return { running: Boolean(server), port: currentPort };
  },
  async startServer() {
    return startServer();
  },
  stopServer() {
    return stopServer();
  },
  async sceneSummary() {
    return executeScene('sceneSummary', [{}]);
  },
};

async function startServer() {
  if (server) {
    return { running: true, port: currentPort, reused: true };
  }
  const config = readConfig();
  currentPort = config.port || 17388;
  server = http.createServer(handleRequest);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(currentPort, '127.0.0.1', resolve);
  });
  console.log('[codex-editor-bridge] listening on 127.0.0.1:' + currentPort);
  return { running: true, port: currentPort, reused: false };
}

function stopServer() {
  if (!server) {
    return { running: false, port: currentPort };
  }
  const closing = server;
  server = null;
  closing.close();
  console.log('[codex-editor-bridge] stopped');
  return { running: false, port: currentPort };
}

async function handleRequest(req, res) {
  try {
    const body = await readBody(req);
    const route = new URL(req.url || '/', 'http://127.0.0.1').pathname;
    if (req.method === 'GET' && route === '/health') {
      return sendJson(res, 200, {
        ok: true,
        package: packageJSON.name,
        version: packageJSON.version,
        port: currentPort,
      });
    }
    if (req.method === 'GET' && route === '/routes') {
      return sendJson(res, 200, {
        ok: true,
        routes: [
          'GET /health',
          'GET /routes',
          'POST /editor/message',
          'POST /assets/query',
          'POST /assets/info',
          'POST /assets/create',
          'POST /scene/summary',
          'POST /scene/open-scene',
          'POST /scene/node-detail',
          'POST /scene/create-node',
          'POST /scene/set-node',
          'POST /scene/add-component',
          'POST /scene/set-component-property',
          'POST /scene/set-component-asset-property',
          'POST /scene/set-component-asset-array-property',
          'POST /scene/apply-blueprint',
          'POST /scene/save',
        ],
      });
    }
    if (req.method === 'POST' && route === '/editor/message') {
      return sendJson(res, 200, await editorMessage(body || {}));
    }
    if (req.method === 'POST' && route === '/assets/query') {
      return sendJson(res, 200, await editorMessage({
        package: 'asset-db',
        message: 'query-assets',
        args: [body && body.options ? body.options : body || {}],
      }));
    }
    if (req.method === 'POST' && route === '/assets/info') {
      const id = body && (body.urlOrUuid || body.uuid || body.url);
      return sendJson(res, 200, await editorMessage({
        package: 'asset-db',
        message: 'query-asset-info',
        args: [id],
      }));
    }
    if (req.method === 'POST' && route === '/assets/create') {
      return sendJson(res, 200, await editorMessage({
        package: 'asset-db',
        message: 'create-asset',
        args: [body && body.url, body && body.content],
      }));
    }
    if (req.method === 'POST' && route === '/scene/summary') {
      return sendJson(res, 200, await executeScene('sceneSummary', [body || {}]));
    }
    if (req.method === 'POST' && route === '/scene/open-scene') {
      return sendJson(res, 200, await editorMessage({
        package: 'scene',
        message: 'open-scene',
        args: [body && (body.sceneUuid || body.uuid)],
      }));
    }
    if (req.method === 'POST' && route === '/scene/node-detail') {
      return sendJson(res, 200, await executeScene('nodeDetail', [body || {}]));
    }
    if (req.method === 'POST' && route === '/scene/create-node') {
      return sendJson(res, 200, await executeScene('createNode', [body || {}]));
    }
    if (req.method === 'POST' && route === '/scene/set-node') {
      return sendJson(res, 200, await executeScene('setNode', [body || {}]));
    }
    if (req.method === 'POST' && route === '/scene/add-component') {
      return sendJson(res, 200, await executeScene('addComponent', [body || {}]));
    }
    if (req.method === 'POST' && route === '/scene/set-component-property') {
      return sendJson(res, 200, await executeScene('setComponentProperty', [body || {}]));
    }
    if (req.method === 'POST' && route === '/scene/set-component-asset-property') {
      return sendJson(res, 200, await executeScene('setComponentAssetProperty', [body || {}]));
    }
    if (req.method === 'POST' && route === '/scene/set-component-asset-array-property') {
      return sendJson(res, 200, await executeScene('setComponentAssetArrayProperty', [body || {}]));
    }
    if (req.method === 'POST' && route === '/scene/apply-blueprint') {
      return sendJson(res, 200, await executeScene('applyBlueprint', [body || {}]));
    }
    if (req.method === 'POST' && route === '/scene/save') {
      return sendJson(res, 200, await editorMessage({
        package: 'scene',
        message: 'save-scene',
        args: body && Array.isArray(body.args) ? body.args : [],
      }));
    }
    return sendJson(res, 404, { ok: false, error: 'unknown route', route, method: req.method });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error && error.stack ? error.stack : String(error) });
  }
}

async function editorMessage(input) {
  const packageName = input.package || input.packageName;
  const message = input.message;
  const args = Array.isArray(input.args) ? input.args : [];
  if (!isAllowedEditorMessage(packageName, message)) {
    return {
      ok: false,
      error: 'Editor message is not allowlisted.',
      package: packageName,
      message,
    };
  }
  try {
    const result = await Editor.Message.request(packageName, message, ...args);
    return { ok: true, package: packageName, message, result };
  } catch (error) {
    return {
      ok: false,
      package: packageName,
      message,
      error: error && error.stack ? error.stack : String(error),
    };
  }
}

function isAllowedEditorMessage(packageName, message) {
  const allowed = {
    'asset-db': new Set([
      'query-assets',
      'query-asset-info',
      'query-uuid',
      'query-url',
      'query-path',
      'create-asset',
    ]),
    scene: new Set([
      'execute-scene-script',
      'query-node',
      'open-scene',
      'save-scene',
    ]),
  };
  return Boolean(packageName && message && allowed[packageName] && allowed[packageName].has(message));
}

async function executeScene(method, args) {
  return Editor.Message.request('scene', 'execute-scene-script', {
    name: packageJSON.name,
    method,
    args: args || [],
  });
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'bridge-config.json'), 'utf8'));
  } catch {
    return { port: 17388 };
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => raw += chunk);
    req.on('error', reject);
    req.on('end', () => {
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(res, status, value) {
  const text = JSON.stringify(value === undefined ? null : value, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
}
`;
}

function editorBridgeSceneJs(): string {
  return String.raw`'use strict';

const { join } = require('path');
module.paths.push(join(Editor.App.path, 'node_modules'));

exports.load = function load() {};
exports.unload = function unload() {};

exports.methods = {
  sceneSummary(options) {
    const { director } = require('cc');
    const scene = director.getScene();
    return {
      ok: true,
      scene: scene ? serializeNode(scene, 0, options && options.maxDepth || 8) : null,
    };
  },
  nodeDetail(options) {
    const { director } = require('cc');
    const scene = director.getScene();
    if (!scene) return { ok: false, error: 'No active scene.' };
    const node = findNode(scene, options && (options.uuid || options.path || options.name));
    if (!node) return { ok: false, error: 'Node not found.' };
    return {
      ok: true,
      node: serializeNode(node, 0, options && options.maxDepth || 2),
    };
  },
  createNode(options) {
    const { director, Node, Vec3 } = require('cc');
    const scene = director.getScene();
    if (!scene) return { ok: false, error: 'No active scene.' };
    const parent = findNode(scene, options && (options.parentUuid || options.parentPath)) || scene;
    const node = new Node(options && options.name || 'Codex Node');
    parent.addChild(node);
    if (options && options.position) {
      node.setPosition(new Vec3(options.position.x || 0, options.position.y || 0, options.position.z || 0));
    }
    if (options && options.scale) {
      node.setScale(new Vec3(options.scale.x ?? 1, options.scale.y ?? 1, options.scale.z ?? 1));
    }
    if (options && typeof options.active === 'boolean') {
      node.active = options.active;
    }
    return { ok: true, node: serializeNode(node, 0, 2), parent: serializeNode(parent, 0, 1) };
  },
  setNode(options) {
    const { director, Vec3 } = require('cc');
    const scene = director.getScene();
    if (!scene) return { ok: false, error: 'No active scene.' };
    const node = findNode(scene, options && (options.uuid || options.path));
    if (!node) return { ok: false, error: 'Node not found.' };
    if (options.name) node.name = options.name;
    if (typeof options.active === 'boolean') node.active = options.active;
    if (options.position) node.setPosition(new Vec3(options.position.x || 0, options.position.y || 0, options.position.z || 0));
    if (options.scale) node.setScale(new Vec3(options.scale.x ?? 1, options.scale.y ?? 1, options.scale.z ?? 1));
    return { ok: true, node: serializeNode(node, 0, 2) };
  },
  addComponent(options) {
    const { director } = require('cc');
    const scene = director.getScene();
    if (!scene) return { ok: false, error: 'No active scene.' };
    const node = findNode(scene, options && (options.uuid || options.path));
    if (!node) return { ok: false, error: 'Node not found.' };
    const type = options && options.type;
    const ctor = resolveComponentConstructor(type);
    if (!ctor) return { ok: false, error: 'Unknown component type: ' + type + '. Make sure custom scripts are imported and compiled.' };
    const component = node.getComponent(ctor) || node.addComponent(ctor);
    return {
      ok: true,
      node: serializeNode(node, 0, 1),
      component: {
        uuid: component.uuid,
        type,
        name: component.name,
      },
    };
  },
  setComponentAssetProperty(options) {
    const { director, assetManager } = require('cc');
    const scene = director.getScene();
    if (!scene) return { ok: false, error: 'No active scene.' };
    const node = findNode(scene, options && (options.nodeUuid || options.nodePath || options.path));
    if (!node) return { ok: false, error: 'Node not found.' };
    const component = findComponent(node, options && (options.componentUuid || options.componentType || options.componentName));
    if (!component) return { ok: false, error: 'Component not found.' };
    const property = options && options.property;
    const uuid = options && (options.assetUuid || options.uuid);
    if (!property || property.includes('.')) return { ok: false, error: 'Only direct component asset properties are supported by this route.' };
    if (!uuid) return { ok: false, error: 'assetUuid is required.' };
    return new Promise((resolve) => {
      assetManager.loadAny({ uuid }, (error, asset) => {
        if (error) {
          resolve({ ok: false, error: error.message || String(error), uuid });
          return;
        }
        component[property] = asset;
        resolve({
          ok: true,
          node: serializeNode(node, 0, 1),
          component: {
            uuid: component.uuid,
            name: component.name,
            type: component.constructor && component.constructor.name,
            property,
            assetUuid: uuid,
            assetName: asset && asset.name,
          },
        });
      });
    });
  },
  setComponentAssetArrayProperty(options) {
    const { director } = require('cc');
    const scene = director.getScene();
    if (!scene) return { ok: false, error: 'No active scene.' };
    const node = findNode(scene, options && (options.nodeUuid || options.nodePath || options.path));
    if (!node) return { ok: false, error: 'Node not found.' };
    const component = findComponent(node, options && (options.componentUuid || options.componentType || options.componentName));
    if (!component) return { ok: false, error: 'Component not found.' };
    const property = options && options.property;
    const uuids = options && (options.assetUuids || options.uuids);
    if (!property || property.includes('.')) return { ok: false, error: 'Only direct component asset array properties are supported by this route.' };
    if (!Array.isArray(uuids) || uuids.length === 0) return { ok: false, error: 'assetUuids must be a non-empty array.' };
    return new Promise((resolve) => {
      Promise.all(uuids.map((uuid) => loadAssetByUuid(uuid))).then((results) => {
        const failed = results
          .map((result, index) => ({ result, index, uuid: uuids[index] }))
          .filter((entry) => !entry.result.ok);
        if (failed.length > 0) {
          resolve({
            ok: false,
            error: 'One or more assets failed to load.',
            failed: failed.map((entry) => ({ index: entry.index, uuid: entry.uuid, error: entry.result.error })),
          });
          return;
        }
        const assets = results.map((result) => result.asset);
        component[property] = assets;
        resolve({
          ok: true,
          node: serializeNode(node, 0, 1),
          component: {
            uuid: component.uuid,
            name: component.name,
            type: component.constructor && component.constructor.name,
            property,
            count: assets.length,
            assetUuids: uuids,
            assetNames: assets.map((asset) => asset && asset.name),
          },
        });
      }).catch((error) => {
        resolve({ ok: false, error: error && error.stack ? error.stack : String(error) });
      });
    });
  },
  setComponentProperty(options) {
    const { director } = require('cc');
    const scene = director.getScene();
    if (!scene) return { ok: false, error: 'No active scene.' };
    const node = findNode(scene, options && (options.nodeUuid || options.nodePath || options.path));
    if (!node) return { ok: false, error: 'Node not found.' };
    const component = findComponent(node, options && (options.componentUuid || options.componentType || options.componentName));
    if (!component) return { ok: false, error: 'Component not found.' };
    const property = options && options.property;
    if (!property || property.includes('.')) return { ok: false, error: 'Only direct component properties are supported by this route.' };
    component[property] = options.value;
    return {
      ok: true,
      node: serializeNode(node, 0, 1),
      component: {
        uuid: component.uuid,
        name: component.name,
        type: component.constructor && component.constructor.name,
        property,
        value: component[property],
      },
    };
  },
  async applyBlueprint(options) {
    const { director } = require('cc');
    const scene = director.getScene();
    if (!scene) return { ok: false, error: 'No active scene.' };
    const blueprint = options && options.blueprint ? options.blueprint : options || {};
    const nodes = Array.isArray(blueprint.nodes) ? blueprint.nodes : [];
    const actions = [];
    const warnings = [];
    for (const spec of nodes) {
      const node = ensureNodePath(scene, spec && (spec.path || makeChildPath(spec.parentPath, spec.name)), actions);
      if (!node) {
        warnings.push({ node: spec && (spec.path || spec.name), error: 'Node path is required.' });
        continue;
      }
      applyNodeOptions(node, spec || {});
      const components = Array.isArray(spec.components) ? spec.components : [];
      for (const componentSpec of components) {
        const result = await applyBlueprintComponent(scene, node, componentSpec || {});
        actions.push(...result.actions);
        warnings.push(...result.warnings);
      }
    }
    for (const spec of nodes) {
      const node = findNode(scene, spec && (spec.path || makeChildPath(spec.parentPath, spec.name)));
      if (!node) continue;
      const components = Array.isArray(spec.components) ? spec.components : [];
      for (const componentSpec of components) {
        const result = await applyBlueprintComponentReferences(scene, node, componentSpec || {});
        actions.push(...result.actions);
        warnings.push(...result.warnings);
      }
    }
    return {
      ok: warnings.length === 0,
      name: blueprint.name,
      nodesProcessed: nodes.length,
      actions,
      warnings,
      scene: serializeNode(scene, 0, 2),
    };
  },
};

async function applyBlueprintComponent(scene, node, spec) {
  const actions = [];
  const warnings = [];
  const type = spec.type;
  const ctor = resolveComponentConstructor(type);
  if (!ctor) {
    warnings.push({ node: getPath(node), component: type, error: 'Unknown component type. Make sure scripts are imported and compiled.' });
    return { actions, warnings };
  }
  const component = node.getComponent(ctor) || node.addComponent(ctor);
  actions.push({ action: 'ensure-component', node: getPath(node), type });

  if (spec.properties && typeof spec.properties === 'object') {
    for (const [property, value] of Object.entries(spec.properties)) {
      if (property.includes('.')) {
        warnings.push({ node: getPath(node), component: type, property, error: 'Nested component properties are not supported.' });
        continue;
      }
      component[property] = value;
      actions.push({ action: 'set-component-property', node: getPath(node), type, property });
    }
  }

  return { actions, warnings };
}

async function applyBlueprintComponentReferences(scene, node, spec) {
  const actions = [];
  const warnings = [];
  const type = spec.type;
  const ctor = resolveComponentConstructor(type);
  if (!ctor) {
    warnings.push({ node: getPath(node), component: type, error: 'Unknown component type. Make sure scripts are imported and compiled.' });
    return { actions, warnings };
  }
  const component = node.getComponent(ctor);
  if (!component) {
    warnings.push({ node: getPath(node), component: type, error: 'Component not found for reference assignment.' });
    return { actions, warnings };
  }

  if (spec.nodeProperties && typeof spec.nodeProperties === 'object') {
    for (const [property, nodePath] of Object.entries(spec.nodeProperties)) {
      if (property.includes('.')) {
        warnings.push({ node: getPath(node), component: type, property, error: 'Nested component properties are not supported.' });
        continue;
      }
      const target = findNode(scene, nodePath);
      if (!target) {
        warnings.push({ node: getPath(node), component: type, property, target: nodePath, error: 'Target node not found.' });
        continue;
      }
      component[property] = target;
      actions.push({ action: 'set-component-node-property', node: getPath(node), type, property, target: getPath(target) });
    }
  }

  if (spec.assetProperties && typeof spec.assetProperties === 'object') {
    for (const [property, uuid] of Object.entries(spec.assetProperties)) {
      if (property.includes('.')) {
        warnings.push({ node: getPath(node), component: type, property, error: 'Nested component properties are not supported.' });
        continue;
      }
      const result = await loadAssetByUuid(uuid);
      if (!result.ok) {
        warnings.push({ node: getPath(node), component: type, property, uuid, error: result.error });
        continue;
      }
      component[property] = result.asset;
      actions.push({ action: 'set-component-asset-property', node: getPath(node), type, property, uuid });
    }
  }

  return { actions, warnings };
}

function makeChildPath(parentPath, name) {
  if (!parentPath || !name) return null;
  return String(parentPath).replace(/\/+$/, '') + '/' + name;
}

function ensureNodePath(scene, path, actions) {
  if (!path) return null;
  const { Node } = require('cc');
  const segments = splitScenePath(scene, path);
  let current = scene;
  for (const segment of segments) {
    let child = current.children.find((candidate) => candidate.name === segment);
    if (!child) {
      child = new Node(segment);
      current.addChild(child);
      actions.push({ action: 'create-node', path: getPath(child) });
    }
    current = child;
  }
  return current;
}

function splitScenePath(scene, path) {
  const segments = String(path).split('/').map((segment) => segment.trim()).filter(Boolean);
  if (segments[0] === scene.name || segments[0] === 'Scene') {
    return segments.slice(1);
  }
  return segments;
}

function applyNodeOptions(node, options) {
  const { Vec3 } = require('cc');
  if (options.name && node.name !== options.name) node.name = options.name;
  if (typeof options.active === 'boolean') node.active = options.active;
  if (options.position) {
    node.setPosition(new Vec3(options.position.x || 0, options.position.y || 0, options.position.z || 0));
  }
  if (options.scale) {
    node.setScale(new Vec3(options.scale.x ?? 1, options.scale.y ?? 1, options.scale.z ?? 1));
  }
}

function loadAssetByUuid(uuid) {
  const { assetManager } = require('cc');
  return new Promise((resolve) => {
    assetManager.loadAny({ uuid }, (error, asset) => {
      if (error) {
        resolve({ ok: false, error: error.message || String(error) });
        return;
      }
      resolve({ ok: true, asset });
    });
  });
}

function serializeNode(node, depth, maxDepth) {
  return {
    uuid: node.uuid,
    name: node.name,
    path: getPath(node),
    siblingIndex: node.getSiblingIndex ? node.getSiblingIndex() : undefined,
    active: node.active,
    position: { x: node.position.x, y: node.position.y, z: node.position.z },
    scale: { x: node.scale.x, y: node.scale.y, z: node.scale.z },
    components: node.components.map((component) => ({
      uuid: component.uuid,
      name: component.name,
      type: component.constructor && component.constructor.name,
    })),
    children: depth >= maxDepth ? [] : node.children.map((child) => serializeNode(child, depth + 1, maxDepth)),
  };
}

function getPath(node) {
  const names = [];
  let current = node;
  while (current) {
    names.push(current.name);
    current = current.parent;
  }
  return names.reverse().join('/');
}

function findNode(scene, query) {
  if (!query) return null;
  const normalizedQuery = normalizeSceneQuery(scene, query);
  if (normalizedQuery === scene.uuid || normalizedQuery === scene.name || normalizedQuery === getPath(scene)) return scene;
  const queue = [scene];
  while (queue.length) {
    const node = queue.shift();
    if (node.uuid === normalizedQuery || getPath(node) === normalizedQuery) return node;
    queue.push(...node.children);
  }
  return null;
}

function normalizeSceneQuery(scene, query) {
  const value = String(query);
  if (value === 'Scene') return scene.name;
  if (value.startsWith('Scene/')) return scene.name + value.slice('Scene'.length);
  return value;
}

function findComponent(node, query) {
  if (!query) return null;
  return node.components.find((component) => {
    const ctorName = component.constructor && component.constructor.name;
    return component.uuid === query || component.name === query || ctorName === query;
  }) || null;
}

function resolveComponentConstructor(type) {
  if (!type) return null;
  const cc = require('cc');
  if (cc[type]) return cc[type];
  if (cc.js && typeof cc.js.getClassByName === 'function') {
    const ctor = cc.js.getClassByName(type);
    if (ctor) return ctor;
  }
  return null;
}
`;
}

export function architectureSkeletonFiles(input: {
  gameName: string;
  preset: z.infer<typeof createArchitectureSkeletonInput>["preset"];
  scriptDir: string;
  planPath: string;
}): Array<{ path: string; content: string }> {
  const scriptDir = normalizeProjectRelativePath(input.scriptDir);
  const planPath = normalizeProjectRelativePath(input.planPath);
  const commonSystems = [
    ["core/GameEventBus.ts", eventBusScript()],
    ["core/GameStateMachine.ts", stateMachineScript()],
    ["core/SystemRegistry.ts", systemRegistryScript()],
    ["data/GameConfig.ts", gameConfigScript()],
    ["data/BalanceTables.ts", balanceTablesScript()],
    ["systems/AssetSystem.ts", systemStubScript("AssetSystem", "Owns runtime asset loading, bundle boundaries, and asset lifetime.")],
    ["systems/AudioSystem.ts", systemStubScript("AudioSystem", "Owns music, SFX, audio unlock, and AudioClip playback routing.")],
    ["systems/InputSystem.ts", systemStubScript("InputSystem", "Normalizes touch, keyboard debug input, gestures, and input enable/disable state.")],
    ["systems/UISystem.ts", systemStubScript("UISystem", "Owns HUD, menu, result, pause, and screen transition coordination.")]
  ];
  const presetSystems = input.preset === "tower-defense"
    ? [
      ["combat/DamageSystem.ts", systemStubScript("DamageSystem", "Resolves damage packets, mitigation, crits, shields, and damage result events.")],
      ["combat/TargetingSystem.ts", systemStubScript("TargetingSystem", "Selects valid targets for towers, projectiles, skills, and enemy abilities.")],
      ["combat/ModifierSystem.ts", systemStubScript("ModifierSystem", "Applies affixes, buffs, debuffs, tags, and temporary stat modifiers.")],
      ["combat/StatusEffectSystem.ts", systemStubScript("StatusEffectSystem", "Ticks slow, burn, stun, poison, mark, and other status effects.")],
      ["towers/TowerSystem.ts", systemStubScript("TowerSystem", "Owns tower placement, upgrades, attack cadence, range checks, and tower lifecycle.")],
      ["enemies/EnemySystem.ts", systemStubScript("EnemySystem", "Owns enemy spawn, path progress, health state, leaks, death, and despawn.")],
      ["waves/WaveSystem.ts", systemStubScript("WaveSystem", "Owns wave schedules, spawn budgets, pacing, and wave completion events.")],
      ["economy/EconomySystem.ts", systemStubScript("EconomySystem", "Owns currency, costs, rewards, refunds, and economy validation.")],
      ["levels/LevelSystem.ts", systemStubScript("LevelSystem", "Owns map layout, path data, build slots, level rules, and win/loss conditions.")],
      ["data/TowerDefenseConfig.ts", towerDefenseConfigScript()]
    ]
    : [
      ["systems/GameplaySystem.ts", systemStubScript("GameplaySystem", "Owns first-loop rules, success/failure conditions, and gameplay state transitions.")],
      ["systems/SpawnSystem.ts", systemStubScript("SpawnSystem", "Owns timed spawning, spawn budgets, and spawn lifecycle events.")],
      ["systems/ScoringSystem.ts", systemStubScript("ScoringSystem", "Owns scoring rules, combos, rewards, and score event emission.")]
    ];
  const plan = architecturePlan(input.gameName, input.preset, [...commonSystems, ...presetSystems].map(([path]) => join(scriptDir, path)));
  return [
    ...commonSystems,
    ...presetSystems,
    [planPath, `${JSON.stringify(plan, null, 2)}\n`]
  ].map(([path, content]) => ({
    path: path === planPath ? path : join(scriptDir, path),
    content
  }));
}

function architecturePlan(gameName: string, preset: z.infer<typeof createArchitectureSkeletonInput>["preset"], files: string[]) {
  const baseBoundaries = [
    "Cocos Components host scene references and forward lifecycle/input into systems.",
    "Core modules provide event, state, and system registration primitives.",
    "Data modules own tunable config and balance tables; gameplay systems consume data without hardcoded magic numbers.",
    "Asset and audio systems isolate generated assets, bundles, AudioClip usage, and runtime loading.",
    "UI systems observe state/events and do not own gameplay rules."
  ];
  return {
    schemaVersion: 1,
    gameName,
    preset,
    createdBy: "cocos_local_create_architecture_skeleton",
    intent: preset === "tower-defense"
      ? "Tower defense architecture boundary scaffold for combat, tower, enemy, wave, economy, level, data, UI, asset, and audio systems."
      : "Generic vertical-slice architecture boundary scaffold for core gameplay, input, UI, assets, audio, scoring, and spawning.",
    boundaries: preset === "tower-defense"
      ? [
        ...baseBoundaries,
        "Damage, targeting, modifiers, and status effects are good candidates for a shared combat contract when towers, projectiles, enemies, and skills interact.",
        "Tower, enemy, wave, economy, and level systems can coordinate through events and typed data when direct component coupling starts to grow."
      ]
      : baseBoundaries,
    generatedFiles: files,
    nextSteps: [
      "Create thin Cocos Component adapters for scene nodes that call these systems.",
      "Use cocos-game-balance-director to fill data tables and ranges.",
      "Use cocos-asset-pipeline-director for first-loop sprites, UI, SFX, and music.",
      "Use cocos-scene-prefab-assembly to attach adapters and serialized references.",
      "Keep or merge systems based on actual complexity; if using a compact manager, keep clear extraction points for domains that grow."
    ]
  };
}

function eventBusScript(): string {
  return `export type GameEvent<TPayload = unknown> = {
    type: string;
    payload: TPayload;
};

export type GameEventHandler<TPayload = unknown> = (event: GameEvent<TPayload>) => void;

export class GameEventBus {
    private readonly handlers = new Map<string, Set<GameEventHandler>>();

    on<TPayload>(type: string, handler: GameEventHandler<TPayload>) {
        const set = this.handlers.get(type) ?? new Set<GameEventHandler>();
        set.add(handler as GameEventHandler);
        this.handlers.set(type, set);
    }

    off<TPayload>(type: string, handler: GameEventHandler<TPayload>) {
        this.handlers.get(type)?.delete(handler as GameEventHandler);
    }

    emit<TPayload>(type: string, payload: TPayload) {
        for (const handler of this.handlers.get(type) ?? []) {
            handler({ type, payload });
        }
    }

    clear() {
        this.handlers.clear();
    }
}
`;
}

function stateMachineScript(): string {
  return `export type GameState = 'boot' | 'menu' | 'playing' | 'paused' | 'win' | 'lose';

export class GameStateMachine {
    private _state: GameState = 'boot';

    get state() {
        return this._state;
    }

    canEnter(next: GameState) {
        if (this._state === next) return true;
        if (this._state === 'boot') return next === 'menu' || next === 'playing';
        if (this._state === 'playing') return next === 'paused' || next === 'win' || next === 'lose';
        if (this._state === 'paused') return next === 'playing' || next === 'menu';
        return next === 'menu' || next === 'playing';
    }

    enter(next: GameState) {
        if (!this.canEnter(next)) {
            throw new Error(\`Invalid state transition: \${this._state} -> \${next}\`);
        }
        this._state = next;
    }
}
`;
}

function systemRegistryScript(): string {
  return `export interface GameSystem {
    readonly name: string;
    reset?(): void;
    update?(deltaTime: number): void;
    dispose?(): void;
}

export class SystemRegistry {
    private readonly systems: GameSystem[] = [];

    add(system: GameSystem) {
        this.systems.push(system);
        return system;
    }

    resetAll() {
        for (const system of this.systems) system.reset?.();
    }

    updateAll(deltaTime: number) {
        for (const system of this.systems) system.update?.(deltaTime);
    }

    disposeAll() {
        for (const system of this.systems) system.dispose?.();
        this.systems.length = 0;
    }
}
`;
}

function gameConfigScript(): string {
  return `export type RuntimeConfig = {
    designWidth: number;
    designHeight: number;
    targetFps: number;
};

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
    designWidth: 720,
    designHeight: 1280,
    targetFps: 60
};
`;
}

function balanceTablesScript(): string {
  return `export type BalanceValue = {
    defaultValue: number;
    min: number;
    max: number;
    unit: string;
    note: string;
};

export const BALANCE_TABLES: Record<string, BalanceValue> = {
    sessionLengthSeconds: { defaultValue: 120, min: 30, max: 300, unit: 'seconds', note: 'Target length for one local test session.' }
};
`;
}

function towerDefenseConfigScript(): string {
  return `export type TowerConfig = {
    id: string;
    cost: number;
    range: number;
    damage: number;
    fireInterval: number;
    tags: string[];
};

export type EnemyConfig = {
    id: string;
    maxHp: number;
    speed: number;
    reward: number;
    tags: string[];
};

export type WaveConfig = {
    id: string;
    enemyId: string;
    count: number;
    interval: number;
};

export const TOWER_CONFIGS: TowerConfig[] = [
    { id: 'basic', cost: 50, range: 180, damage: 10, fireInterval: 0.8, tags: ['single-target'] }
];

export const ENEMY_CONFIGS: EnemyConfig[] = [
    { id: 'runner', maxHp: 30, speed: 70, reward: 5, tags: ['ground'] }
];

export const WAVE_CONFIGS: WaveConfig[] = [
    { id: 'wave-01', enemyId: 'runner', count: 8, interval: 1.0 }
];
`;
}

function systemStubScript(className: string, responsibility: string): string {
  return `import type { GameSystem } from '../core/SystemRegistry';

export class ${className} implements GameSystem {
    readonly name = '${className}';

    constructor() {
        // Responsibility: ${responsibility}
    }

    reset() {
    }

    update(deltaTime: number) {
        void deltaTime;
    }

    dispose() {
    }
}
`;
}

export function starterSkeletonFiles(input: {
  gameName: string;
  scriptDir: string;
  blueprintPath: string;
  targetScore: number;
}): Array<{ path: string; content: string }> {
  const scriptDir = normalizeProjectRelativePath(input.scriptDir);
  const blueprintPath = normalizeProjectRelativePath(input.blueprintPath);
  return [
    {
      path: join(scriptDir, "HUDView.ts"),
      content: hudViewScript()
    },
    {
      path: join(scriptDir, "GameManager.ts"),
      content: gameManagerScript()
    },
    {
      path: join(scriptDir, "InputManager.ts"),
      content: inputManagerScript()
    },
    {
      path: join(scriptDir, "PlayerController.ts"),
      content: playerControllerScript()
    },
    {
      path: join(scriptDir, "PoolManager.ts"),
      content: poolManagerScript()
    },
    {
      path: blueprintPath,
      content: `${JSON.stringify(starterSceneBlueprint(input.gameName, input.targetScore), null, 2)}\n`
    }
  ];
}

function starterSceneBlueprint(gameName: string, targetScore: number) {
  return {
    schemaVersion: 1,
    name: gameName,
    createdBy: "cocos_local_create_minigame_skeleton",
    description: "Minimal 2D mini-game scene graph for Cocos Creator 3.8 local assembly.",
    applyWith: "POST /scene/apply-blueprint",
    nodes: [
      {
        path: "Scene/Canvas",
        components: [{ type: "Canvas" }]
      },
      { path: "Scene/Canvas/GameRoot" },
      { path: "Scene/Canvas/GameRoot/PlayerSpawn" },
      { path: "Scene/Canvas/GameRoot/EnemyRoot" },
      { path: "Scene/Canvas/GameRoot/ProjectileRoot" },
      { path: "Scene/Canvas/GameRoot/PickupRoot" },
      { path: "Scene/Canvas/GameRoot/EffectRoot" },
      { path: "Scene/Canvas/GameRoot/Player", components: [{ type: "PlayerController", properties: { speed: 360 } }] },
      { path: "Scene/Canvas/UIRoot" },
      { path: "Scene/Canvas/UIRoot/HUD" },
      {
        path: "Scene/Canvas/UIRoot/HUD/ScoreLabel",
        position: { x: -260, y: 300, z: 0 },
        components: [{ type: "Label", properties: { string: "Score: 0" } }]
      },
      {
        path: "Scene/Canvas/UIRoot/HUD/StatusLabel",
        position: { x: 0, y: 260, z: 0 },
        components: [{ type: "Label", properties: { string: "Ready" } }]
      },
      {
        path: "Scene/Canvas/UIRoot/HUD",
        components: [{
          type: "HUDView",
          nodeProperties: {
            scoreLabelNode: "Scene/Canvas/UIRoot/HUD/ScoreLabel",
            statusLabelNode: "Scene/Canvas/UIRoot/HUD/StatusLabel"
          }
        }]
      },
      { path: "Scene/Canvas/UIRoot/PausePanel", active: false },
      { path: "Scene/Canvas/UIRoot/ResultPanel", active: false },
      { path: "Scene/Canvas/Managers" },
      {
        path: "Scene/Canvas/Managers/GameManager",
        components: [{
          type: "GameManager",
          properties: { targetScore },
          nodeProperties: {
            gameRoot: "Scene/Canvas/GameRoot",
            uiRoot: "Scene/Canvas/UIRoot",
            hudNode: "Scene/Canvas/UIRoot/HUD"
          }
        }]
      },
      {
        path: "Scene/Canvas/Managers/InputManager",
        components: [{
          type: "InputManager",
          nodeProperties: {
            eventTarget: "Scene/Canvas/GameRoot/Player"
          }
        }]
      },
      { path: "Scene/Canvas/Managers/AudioManager" },
      { path: "Scene/Canvas/Managers/PoolManager", components: [{ type: "PoolManager" }] }
    ],
    verification: [
      "Generated scripts have been imported and compiled by Cocos Creator.",
      "Editor Bridge /scene/apply-blueprint returned ok: true or only expected warnings.",
      "Scene was saved after applying the blueprint.",
      "Start scene is included in the wechatgame build config."
    ]
  };
}

function hudViewScript(): string {
  return `import { _decorator, Component, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HUDView')
export class HUDView extends Component {
    @property(Node)
    scoreLabelNode: Node | null = null;

    @property(Node)
    statusLabelNode: Node | null = null;

    private _scoreLabel: Label | null = null;
    private _statusLabel: Label | null = null;

    onLoad() {
        this._scoreLabel = this.scoreLabelNode?.getComponent(Label) ?? null;
        this._statusLabel = this.statusLabelNode?.getComponent(Label) ?? null;
        this.setScore(0);
        this.setStatus('Ready');
    }

    setScore(score: number) {
        if (this._scoreLabel) {
            this._scoreLabel.string = \`Score: \${score}\`;
        }
    }

    setStatus(status: string) {
        if (this._statusLabel) {
            this._statusLabel.string = status;
        }
    }
}
`;
}

function gameManagerScript(): string {
  return `import { _decorator, Component, Node } from 'cc';
import { HUDView } from './HUDView';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Node)
    gameRoot: Node | null = null;

    @property(Node)
    uiRoot: Node | null = null;

    @property(Node)
    hudNode: Node | null = null;

    @property
    targetScore = 10;

    private _hud: HUDView | null = null;
    private _score = 0;
    private _running = false;

    onLoad() {
        this._hud = this.hudNode?.getComponent(HUDView) ?? null;
    }

    start() {
        this.resetGame();
    }

    startGame() {
        this._running = true;
        this._hud?.setStatus('Playing');
    }

    resetGame() {
        this._score = 0;
        this._running = false;
        this._hud?.setScore(this._score);
        this._hud?.setStatus('Ready');
    }

    addScore(value = 1) {
        if (!this._running) {
            this.startGame();
        }
        this._score += value;
        this._hud?.setScore(this._score);
        if (this._score >= this.targetScore) {
            this.finishGame(true);
        }
    }

    finishGame(win: boolean) {
        this._running = false;
        this._hud?.setStatus(win ? 'You Win' : 'Game Over');
    }
}
`;
}

function inputManagerScript(): string {
  return `import { _decorator, Component, EventTouch, input, Input, Node, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('InputManager')
export class InputManager extends Component {
    @property(Node)
    eventTarget: Node | null = null;

    private readonly _lastTouch = new Vec2();

    onEnable() {
        input.on(Input.EventType.TOUCH_START, this.onTouch, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouch, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onDisable() {
        input.off(Input.EventType.TOUCH_START, this.onTouch, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouch, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouch(event: EventTouch) {
        const location = event.getUILocation();
        this._lastTouch.set(location.x, location.y);
        this.eventTarget?.emit('codex-touch-move', this._lastTouch);
    }

    private onTouchEnd() {
        this.eventTarget?.emit('codex-touch-end');
    }
}
`;
}

function playerControllerScript(): string {
  return `import { _decorator, Component, Node, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property
    speed = 360;

    @property(Node)
    viewRoot: Node | null = null;

    private readonly _moveTarget = new Vec2();
    private _hasTarget = false;

    onEnable() {
        this.node.on('codex-touch-move', this.onTouchMove, this);
        this.node.on('codex-touch-end', this.onTouchEnd, this);
    }

    onDisable() {
        this.node.off('codex-touch-move', this.onTouchMove, this);
        this.node.off('codex-touch-end', this.onTouchEnd, this);
    }

    update(deltaTime: number) {
        if (!this._hasTarget) return;
        const current = this.node.position;
        const maxStep = this.speed * deltaTime;
        const dx = this._moveTarget.x - current.x;
        const dy = this._moveTarget.y - current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= maxStep || distance === 0) {
            this.node.setPosition(this._moveTarget.x, this._moveTarget.y, current.z);
            return;
        }
        const ratio = maxStep / distance;
        this.node.setPosition(current.x + dx * ratio, current.y + dy * ratio, current.z);
    }

    private onTouchMove(position: Vec2) {
        this._moveTarget.set(position.x, position.y);
        this._hasTarget = true;
    }

    private onTouchEnd() {
        this._hasTarget = false;
    }
}
`;
}

function poolManagerScript(): string {
  return `import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('PoolManager')
export class PoolManager extends Component {
    private readonly _pool = new Map<string, Node[]>();

    put(key: string, node: Node) {
        node.active = false;
        node.removeFromParent();
        const list = this._pool.get(key) ?? [];
        list.push(node);
        this._pool.set(key, list);
    }

    take(key: string, parent: Node): Node | null {
        const list = this._pool.get(key);
        const node = list?.pop() ?? null;
        if (!node) return null;
        parent.addChild(node);
        node.active = true;
        return node;
    }

    clearPool() {
        this._pool.clear();
    }
}
`;
}

function sanitizeClassName(value: string): string {
  const normalized = value
    .replace(/[^A-Za-z0-9_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
  const fallback = normalized || "CodexComponent";
  return /^[A-Za-z_]/.test(fallback) ? fallback : `C${fallback}`;
}

function toAssetDbUrl(projectRoot: string, filePath: string): string {
  const relative = filePath.slice(resolve(projectRoot).length + 1).replaceAll("\\", "/");
  return `db://${relative}`;
}

function normalizeAssetReference(projectRoot: string, assetPath: string): string {
  const normalized = assetPath.replaceAll("\\", "/");
  if (normalized.startsWith("db://")) return normalized;
  if (normalized.startsWith("assets/")) return `db://${normalized}`;
  if (normalized.startsWith("/")) return toAssetDbUrl(projectRoot, resolve(assetPath));
  return `db://assets/${normalized.replace(/^\/+/, "")}`;
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    || /^[0-9A-Za-z+/]{20,32}$/.test(value);
}

function makeChildNodePath(parentPath: string, name: string): string {
  return `${parentPath.replace(/\/+$/, "")}/${name.replace(/^\/+/, "")}`;
}

function inferNodeNameFromAsset(assetPath: string): string {
  const withoutQuery = assetPath.split(/[?#]/)[0] ?? assetPath;
  const base = basename(withoutQuery, extname(withoutQuery));
  const clean = base.replace(/[^A-Za-z0-9_ -]+/g, " ").trim();
  if (!clean) return "Sprite";
  return clean
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function extractEditorResult(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const outer = value as { response?: unknown };
  const response = outer.response;
  if (!response || typeof response !== "object") return response ?? value;
  const inner = response as { result?: unknown };
  return inner.result ?? response;
}

function findSpriteFrameUuid(value: unknown): string | null {
  const match = findInUnknown(value, (candidate) => {
    const type = stringifyUnknown(candidate.type ?? candidate.importer ?? candidate.ctor ?? candidate.__type__ ?? candidate.name);
    const url = stringifyUnknown(candidate.url ?? candidate.path);
    const displayName = stringifyUnknown(candidate.displayName ?? candidate.name);
    const looksSpriteFrame = /sprite[\s_-]*frame/i.test(`${type} ${url} ${displayName}`);
    const uuid = stringifyUnknown(candidate.uuid ?? candidate.__uuid__ ?? nestedUuid(candidate.value));
    return looksSpriteFrame && uuid ? uuid : null;
  });
  return match;
}

function findFirstUuid(value: unknown): string | null {
  return findInUnknown(value, (candidate) => stringifyUnknown(candidate.uuid ?? candidate.__uuid__) || null);
}

function nestedUuid(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return stringifyUnknown(record.uuid ?? record.__uuid__);
}

function findInUnknown(value: unknown, pick: (candidate: Record<string, unknown>) => string | null): string | null {
  const seen = new Set<unknown>();
  const queue: unknown[] = [value];
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    const record = current as Record<string, unknown>;
    const picked = pick(record);
    if (picked) return picked;
    for (const nested of Object.values(record)) {
      if (nested && typeof nested === "object") queue.push(nested);
    }
  }
  return null;
}

function stringifyUnknown(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function cocosCreatorTemplatesDir(creatorPath: string): string {
  return join(dirname(dirname(creatorPath)), "Resources", "templates");
}

function cocosCreatorDefaultSceneTemplate(creatorPath: string, template: "2d" | "3d" | "quality"): { scene: string; meta: string } {
  const fileName = {
    "2d": "scene-2d.scene",
    "3d": "default.scene",
    quality: "scene-quality.scene"
  }[template];
  const scene = join(dirname(dirname(creatorPath)), "Resources", "resources", "3d", "engine", "editor", "assets", "default_file_content", "scene", fileName);
  return {
    scene,
    meta: `${scene}.meta`
  };
}

function sanitizePackageName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "cocos-game";
}

function sanitizeSceneName(value: string): string {
  const normalized = value.trim().replace(/[\\/]+/g, "-");
  return normalized || "Main";
}

function normalizeProjectRelativePath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter((part) => part && part !== ".");
  if (parts.some((part) => part === "..")) {
    throw new Error(`Project-relative paths cannot contain '..': ${value}`);
  }
  return parts.join("/");
}

function resolveProjectPath(projectRoot: string, relativePath: string): string {
  const root = resolve(projectRoot);
  const absolutePath = resolve(root, normalizeProjectRelativePath(relativePath));
  if (absolutePath !== root && !absolutePath.startsWith(`${root}/`)) {
    throw new Error(`Path escapes project root: ${relativePath}`);
  }
  return absolutePath;
}

function makeComponentScript(input: {
  className: string;
  description?: string;
  properties: z.infer<typeof createComponentScriptInput>["properties"];
  lifecycle: z.infer<typeof createComponentScriptInput>["lifecycle"];
}): string {
  const importTypes = new Set<string>(["_decorator", "Component"]);
  for (const property of input.properties) {
    if (["Node", "Label", "Sprite", "AudioClip", "Prefab"].includes(property.type)) {
      importTypes.add(property.type);
    }
  }
  const lines = [
    `import { ${[...importTypes].join(", ")} } from 'cc';`,
    "const { ccclass, property } = _decorator;",
    "",
    `@ccclass('${input.className}')`,
    `export class ${input.className} extends Component {`
  ];
  if (input.description) {
    lines.push(`    // ${input.description}`);
  }
  for (const field of input.properties) {
    lines.push(...propertyLines(field));
  }
  for (const lifecycle of input.lifecycle) {
    if (lifecycle === "update") {
      lines.push("", "    update(deltaTime: number) {", "    }");
    } else {
      lines.push("", `    ${lifecycle}() {`, "    }");
    }
  }
  lines.push("}", "");
  return lines.join("\n");
}

function propertyLines(field: z.infer<typeof createComponentScriptInput>["properties"][number]): string[] {
  const name = sanitizePropertyName(field.name);
  switch (field.type) {
    case "number":
      return ["", "    @property", `    ${name} = ${typeof field.defaultValue === "number" ? field.defaultValue : 0};`];
    case "string":
      return ["", "    @property", `    ${name} = ${JSON.stringify(typeof field.defaultValue === "string" ? field.defaultValue : "")};`];
    case "boolean":
      return ["", "    @property", `    ${name} = ${typeof field.defaultValue === "boolean" ? field.defaultValue : false};`];
    default:
      return ["", `    @property(${field.type})`, `    ${name}: ${field.type} | null = null;`];
  }
}

function sanitizePropertyName(value: string): string {
  const parts = value.replace(/[^A-Za-z0-9_]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const camel = parts.map((part, index) => {
    const lower = part.charAt(0).toLowerCase() + part.slice(1);
    return index === 0 ? lower : `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
  }).join("") || "value";
  return /^[A-Za-z_]/.test(camel) ? camel : `v${camel}`;
}

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}
