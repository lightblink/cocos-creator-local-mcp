import { describe, expect, it } from "vitest";
import {
  architectureSkeletonFiles,
  editorBridgeFiles,
  makeWechatBuildConfig,
  makeWechatDevToolsCommand,
  makeWechatDevToolsManagementCommand,
  starterSkeletonFiles
} from "../src/tools/cocos-local.js";

describe("cocos local editor bridge scaffold", () => {
  it("creates a Cocos Creator 3.x extension with main and scene bridge files", () => {
    const files = editorBridgeFiles("codex-editor-bridge", 17388);
    const byPath = new Map(files.map((file) => [file.path, file.content]));
    const packageJson = JSON.parse(byPath.get("package.json") ?? "{}") as {
      name?: string;
      package_version?: number;
      main?: string;
      contributions?: {
        scene?: { script?: string };
        messages?: Record<string, unknown>;
      };
    };

    expect(packageJson).toMatchObject({
      name: "codex-editor-bridge",
      package_version: 2,
      main: "./browser.js"
    });
    expect(packageJson.contributions?.scene?.script).toBe("./scene.js");
    expect(packageJson.contributions?.messages).toHaveProperty("scene-summary");
    expect(byPath.get("bridge-config.json")).toContain("17388");
    expect(byPath.get("browser.js")).toContain("/scene/summary");
    expect(byPath.get("browser.js")).toContain("/editor/message");
    expect(byPath.get("browser.js")).toContain("/assets/query");
    expect(byPath.get("browser.js")).toContain("query-asset-info");
    expect(byPath.get("browser.js")).toContain("isAllowedEditorMessage");
    expect(byPath.get("browser.js")).toContain("/scene/open-scene");
    expect(byPath.get("browser.js")).toContain("/scene/set-component-asset-property");
    expect(byPath.get("browser.js")).toContain("/scene/set-component-asset-array-property");
    expect(byPath.get("browser.js")).toContain("/scene/apply-blueprint");
    expect(byPath.get("browser.js")).toContain("open-scene");
    expect(byPath.get("browser.js")).toContain("execute-scene-script");
    expect(byPath.get("scene.js")).toContain("sceneSummary");
    expect(byPath.get("scene.js")).toContain("nodeDetail");
    expect(byPath.get("scene.js")).toContain("setComponentProperty");
    expect(byPath.get("scene.js")).toContain("setComponentAssetProperty");
    expect(byPath.get("scene.js")).toContain("applyBlueprint");
    expect(byPath.get("scene.js")).toContain("ensureNodePath");
    expect(byPath.get("scene.js")).toContain("normalizeSceneQuery");
    expect(byPath.get("scene.js")).toContain("getClassByName");
    expect(byPath.get("scene.js")).toContain("assetProperties");
    expect(byPath.get("scene.js")).toContain("loadAssetByUuid");
    expect(byPath.get("scene.js")).toContain("setComponentAssetArrayProperty");
  });
});

describe("cocos local mini-game skeleton scaffold", () => {
  it("creates reusable scripts and a scene assembly blueprint", () => {
    const files = starterSkeletonFiles({
      gameName: "Pocket Runner",
      scriptDir: "assets/scripts/codex",
      blueprintPath: ".codex/cocos/starter-scene-blueprint.json",
      targetScore: 12
    });
    const byPath = new Map(files.map((file) => [file.path, file.content]));
    const blueprint = JSON.parse(byPath.get(".codex/cocos/starter-scene-blueprint.json") ?? "{}") as {
      name?: string;
      applyWith?: string;
      nodes?: Array<{ path?: string; components?: Array<{ type?: string; properties?: Record<string, unknown> }> }>;
    };

    expect(byPath.get("assets/scripts/codex/GameManager.ts")).toContain("@ccclass('GameManager')");
    expect(byPath.get("assets/scripts/codex/HUDView.ts")).toContain("@ccclass('HUDView')");
    expect(byPath.get("assets/scripts/codex/InputManager.ts")).toContain("TOUCH_START");
    expect(byPath.get("assets/scripts/codex/PlayerController.ts")).toContain("speed = 360");
    expect(byPath.get("assets/scripts/codex/PoolManager.ts")).toContain("@ccclass('PoolManager')");
    expect(blueprint).toMatchObject({
      name: "Pocket Runner",
      applyWith: "POST /scene/apply-blueprint"
    });
    expect(blueprint.nodes?.some((node) => node.path === "Scene/Canvas/Managers/GameManager")).toBe(true);
    expect(blueprint.nodes?.some((node) => node.components?.some((component) => component.type === "Label"))).toBe(true);
    expect(JSON.stringify(blueprint)).toContain('"targetScore":12');
  });
});

describe("cocos architecture skeleton scaffold", () => {
  it("offers tower defense system boundaries as a starting point", () => {
    const files = architectureSkeletonFiles({
      gameName: "Pocket Defense",
      preset: "tower-defense",
      scriptDir: "assets/scripts/game",
      planPath: ".codex/cocos/architecture-plan.json"
    });
    const paths = files.map((file) => file.path);
    const byPath = new Map(files.map((file) => [file.path, file.content]));
    const plan = JSON.parse(byPath.get(".codex/cocos/architecture-plan.json") ?? "{}") as {
      preset?: string;
      boundaries?: string[];
      generatedFiles?: string[];
    };

    expect(paths).toContain("assets/scripts/game/combat/DamageSystem.ts");
    expect(paths).toContain("assets/scripts/game/combat/ModifierSystem.ts");
    expect(paths).toContain("assets/scripts/game/towers/TowerSystem.ts");
    expect(paths).toContain("assets/scripts/game/waves/WaveSystem.ts");
    expect(paths).toContain("assets/scripts/game/economy/EconomySystem.ts");
    expect(paths).toContain("assets/scripts/game/data/TowerDefenseConfig.ts");
    expect(paths.some((path) => path.endsWith("GameManager.ts"))).toBe(false);
    expect(plan.preset).toBe("tower-defense");
    expect(plan.boundaries?.join(" ")).toContain("shared combat contract");
    expect(plan.generatedFiles?.length).toBeGreaterThan(12);
  });
});

describe("wechat build config helper", () => {
  it("preserves mobile design resolution settings for Cocos builds", () => {
    const config = makeWechatBuildConfig({
      outputName: "wechatgame",
      buildPath: "project://build",
      gameName: "Pocket Blocks",
      debug: true,
      md5Cache: false,
      appid: "wx0000000000000000",
      packages: { orientation: "portrait" },
      designResolution: {
        width: 720,
        height: 1280,
        fitWidth: true,
        fitHeight: false
      },
      startScene: "main-scene-uuid"
    });

    expect(config).toMatchObject({
      taskName: "wechatgame",
      platform: "wechatgame",
      designResolution: {
        width: 720,
        height: 1280,
        fitWidth: true,
        fitHeight: false
      },
      startScene: "main-scene-uuid",
      packages: {
        wechatgame: {
          appid: "wx0000000000000000",
          orientation: "portrait"
        }
      }
    });
  });
});

describe("wechat devtools command helpers", () => {
  it("builds deterministic open and preview commands", () => {
    const open = makeWechatDevToolsCommand("/Applications/wechatwebdevtools.app/Contents/MacOS/cli", "open", {
      project: "/tmp/game/build/wechatgame",
      port: 9420,
      lang: "en",
      disableGpu: true
    });
    expect(open.args).toEqual([
      "open",
      "--project",
      "/tmp/game/build/wechatgame",
      "--port",
      "9420",
      "--lang",
      "en",
      "--disable-gpu"
    ]);

    const preview = makeWechatDevToolsCommand("/cli", "preview", {
      project: "/tmp/game/build/wechatgame",
      qrFormat: "image",
      qrOutput: "/tmp/qr.png",
      infoOutput: "/tmp/preview.json"
    });
    expect(preview.args).toEqual([
      "preview",
      "--project",
      "/tmp/game/build/wechatgame",
      "--qr-format",
      "image",
      "--qr-output",
      "/tmp/qr.png",
      "--info-output",
      "/tmp/preview.json"
    ]);
  });

  it("builds cache, close, and quit management commands", () => {
    expect(makeWechatDevToolsManagementCommand("/cli", {
      action: "clean-cache",
      project: "/tmp/game/build/wechatgame",
      cacheType: "compile",
      lang: "zh"
    }).args).toEqual(["cache", "--clean", "compile", "--project", "/tmp/game/build/wechatgame", "--lang", "zh"]);

    expect(makeWechatDevToolsManagementCommand("/cli", {
      action: "close",
      project: "/tmp/game/build/wechatgame"
    }).args).toEqual(["close", "--project", "/tmp/game/build/wechatgame"]);

    expect(makeWechatDevToolsManagementCommand("/cli", {
      action: "quit",
      project: "/tmp/game/build/wechatgame"
    }).args).toEqual(["quit"]);
  });
});
