import { type JSONSchema } from "json-schema-typed";

import { ipcMain } from "electron";
import Store from "electron-store";

import { destroyDiscordRpc, initDiscordRpc } from "./discordRpc";
import {
  getInstanceManagerWindow,
  getInstanceViews,
  getSidebarView,
  mainWindow,
} from "./window";

const schema = {
  firstLaunch: {
    type: "boolean",
  } as JSONSchema.Boolean,
  customFrame: {
    type: "boolean",
  } as JSONSchema.Boolean,
  minimiseToTray: {
    type: "boolean",
  } as JSONSchema.Boolean,
  startMinimisedToTray: {
    type: "boolean",
  } as JSONSchema.Boolean,
  spellchecker: {
    type: "boolean",
  } as JSONSchema.Boolean,
  hardwareAcceleration: {
    type: "boolean",
  } as JSONSchema.Boolean,
  discordRpc: {
    type: "boolean",
  } as JSONSchema.Boolean,
  instances: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" } as JSONSchema.String,
        label: { type: "string" } as JSONSchema.String,
        url: { type: "string" } as JSONSchema.String,
      },
    },
  } as JSONSchema.Array,
  activeInstanceId: {
    type: "string",
  } as JSONSchema.String,
  windowState: {
    type: "object",
    properties: {
      x: {
        type: "number",
      } as JSONSchema.Number,
      y: {
        type: "number",
      } as JSONSchema.Number,
      width: {
        type: "number",
      } as JSONSchema.Number,
      height: {
        type: "number",
      } as JSONSchema.Number,
      isMaximised: {
        type: "boolean",
      } as JSONSchema.Boolean,
    },
  } as JSONSchema.Object,
};

const DEFAULT_INSTANCES: Instance[] = [
  { id: "default", label: "Revolt", url: "https://beta.revolt.chat" },
];

const store = new Store({
  schema,
  defaults: {
    firstLaunch: true,
    customFrame: true,
    minimiseToTray: true,
    startMinimisedToTray: false,
    spellchecker: true,
    hardwareAcceleration: true,
    discordRpc: true,
    instances: DEFAULT_INSTANCES,
    activeInstanceId: "default",
    windowState: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      isMaximised: false,
    },
  } as DesktopConfig,
});

/**
 * Shim for `electron-store` because typings are broken
 */
class Config {
  sync() {
    const data = {
      firstLaunch: this.firstLaunch,
      customFrame: this.customFrame,
      minimiseToTray: this.minimiseToTray,
      startMinimisedToTray: this.startMinimisedToTray,
      spellchecker: this.spellchecker,
      hardwareAcceleration: this.hardwareAcceleration,
      discordRpc: this.discordRpc,
      instances: this.instances,
      activeInstanceId: this.activeInstanceId,
      windowState: this.windowState,
    };

    // Send config to all instance views
    for (const view of getInstanceViews().values()) {
      try {
        view.webContents.send("config", data);
      } catch {
        // view may have been destroyed
      }
    }

    // Also send to sidebar
    try {
      getSidebarView()?.webContents.send("instances-changed", {
        instances: this.instances,
        activeInstanceId: this.activeInstanceId,
      });
    } catch {
      // sidebar may not exist yet
    }

    // Also send to instance manager window if open
    try {
      const mgr = getInstanceManagerWindow();
      if (mgr && !mgr.isDestroyed()) {
        mgr.webContents.send("instances-changed", {
          instances: this.instances,
          activeInstanceId: this.activeInstanceId,
        });
      }
    } catch {
      // instance manager may not exist
    }
  }

  get firstLaunch() {
    return (store as never as { get(k: string): boolean }).get("firstLaunch");
  }

  set firstLaunch(value: boolean) {
    (store as never as { set(k: string, value: boolean): void }).set(
      "firstLaunch",
      value,
    );

    this.sync();
  }

  get customFrame() {
    return (store as never as { get(k: string): boolean }).get("customFrame");
  }

  set customFrame(value: boolean) {
    (store as never as { set(k: string, value: boolean): void }).set(
      "customFrame",
      value,
    );

    this.sync();
  }

  get minimiseToTray() {
    return (store as never as { get(k: string): boolean }).get(
      "minimiseToTray",
    );
  }

  set minimiseToTray(value: boolean) {
    (store as never as { set(k: string, value: boolean): void }).set(
      "minimiseToTray",
      value,
    );

    this.sync();
  }

  get startMinimisedToTray() {
    return (store as never as { get(k: string): boolean }).get(
      "startMinimisedToTray",
    );
  }

  set startMinimisedToTray(value: boolean) {
    (store as never as { set(k: string, value: boolean): void }).set(
      "startMinimisedToTray",
      value,
    );

    this.sync();
  }

  get spellchecker() {
    return (store as never as { get(k: string): boolean }).get("spellchecker");
  }

  set spellchecker(value: boolean) {
    // Enable/disable spellchecker on all instance views
    for (const view of getInstanceViews().values()) {
      try {
        view.webContents.session.setSpellCheckerEnabled(value);
      } catch {
        // view may have been destroyed
      }
    }

    (store as never as { set(k: string, value: boolean): void }).set(
      "spellchecker",
      value,
    );

    this.sync();
  }

  get hardwareAcceleration() {
    return (store as never as { get(k: string): boolean }).get(
      "hardwareAcceleration",
    );
  }

  set hardwareAcceleration(value: boolean) {
    (store as never as { set(k: string, value: boolean): void }).set(
      "hardwareAcceleration",
      value,
    );

    this.sync();
  }

  get discordRpc() {
    return (store as never as { get(k: string): boolean }).get("discordRpc");
  }

  set discordRpc(value: boolean) {
    if (value) {
      initDiscordRpc();
    } else {
      destroyDiscordRpc();
    }

    (store as never as { set(k: string, value: boolean): void }).set(
      "discordRpc",
      value,
    );

    this.sync();
  }

  get instances(): Instance[] {
    return (store as never as { get(k: string): Instance[] }).get("instances");
  }

  set instances(value: Instance[]) {
    (store as never as { set(k: string, value: Instance[]): void }).set(
      "instances",
      value,
    );

    this.sync();
  }

  get activeInstanceId(): string {
    return (store as never as { get(k: string): string }).get(
      "activeInstanceId",
    );
  }

  set activeInstanceId(value: string) {
    (store as never as { set(k: string, value: string): void }).set(
      "activeInstanceId",
      value,
    );

    this.sync();
  }

  get windowState() {
    return (
      store as never as { get(k: string): DesktopConfig["windowState"] }
    ).get("windowState");
  }

  set windowState(value: DesktopConfig["windowState"]) {
    (
      store as never as {
        set(k: string, value: DesktopConfig["windowState"]): void;
      }
    ).set("windowState", value);

    this.sync();
  }
}

export const config = new Config();

ipcMain.on("config", (_, newConfig: Partial<DesktopConfig>) => {
  console.info("Received new configuration", newConfig);
  Object.entries(newConfig).forEach(
    ([key, value]) => (config[key as keyof DesktopConfig] = value as never),
  );
});
