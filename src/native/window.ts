import { join } from "node:path";

import {
  BrowserWindow,
  Menu,
  MenuItem,
  WebContentsView,
  app,
  globalShortcut,
  ipcMain,
  nativeImage,
} from "electron";

import windowIconAsset from "../../assets/desktop/icon.png?asset";

import { config } from "./config";
import { updateTrayMenu } from "./tray";

// global reference to main window
export let mainWindow: BrowserWindow;

// sidebar view reference
let sidebarView: WebContentsView | null = null;

// map of instance ID → WebContentsView
const instanceViews = new Map<string, WebContentsView>();

// map of webContents ID → instance URL origin (for nav guards)
export const webContentsOriginMap = new Map<number, string>();

// currently active instance ID
let activeInstanceId: string | null = null;

// titlebar height
const TITLEBAR_HEIGHT = 36;

// internal window state
let shouldQuit = false;

// load the window icon
const windowIcon = nativeImage.createFromDataURL(windowIconAsset);

/** Get the instance views map (for config sync etc.) */
export function getInstanceViews() {
  return instanceViews;
}

/** Get the sidebar view (for config sync etc.) */
export function getSidebarView() {
  return sidebarView;
}

/**
 * Update the layout of all views within the main window
 */
function layoutViews() {
  if (!mainWindow) return;

  // getContentSize() returns the inner content area on all platforms:
  // - frame:false  → equals full window size
  // - titlebarStyle:'hidden' (macOS) → equals full window size (traffic lights are overlaid)
  // - frame:true   → excludes the OS title bar / window chrome
  const [width, height] = mainWindow.getContentSize();
  const useCustomFrame = config.customFrame;
  const barHeight = useCustomFrame ? TITLEBAR_HEIGHT : 0;

  // Position titlebar at top (full width)
  if (sidebarView) {
    if (useCustomFrame) {
      sidebarView.setBounds({
        x: 0,
        y: 0,
        width,
        height: barHeight,
      });
    } else {
      sidebarView.setBounds({ x: -99999, y: -99999, width: 1, height: 1 });
    }
  }

  // Position the active instance view below the titlebar
  for (const [id, view] of instanceViews) {
    if (id === activeInstanceId) {
      view.setBounds({
        x: 0,
        y: barHeight,
        width,
        height: height - barHeight,
      });
    } else {
      // Move inactive views off-screen to avoid hit-test interference on Linux/GTK
      view.setBounds({ x: -99999, y: -99999, width: 1, height: 1 });
    }
  }
}

/**
 * Configure common webContents behaviours for an instance view
 */
function configureInstanceView(view: WebContentsView) {
  const wc = view.webContents;

  // rebind zoom controls
  wc.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    // support both Ctrl (Linux/Win) and Cmd (macOS) for zoom
    const accel = input.control || input.meta;
    if (accel && (input.key === "=" || input.key === "+")) {
      event.preventDefault();
      wc.setZoomLevel(wc.getZoomLevel() + 1);
    } else if (accel && input.key === "-") {
      event.preventDefault();
      wc.setZoomLevel(wc.getZoomLevel() - 1);
    } else if (accel && input.key === "0") {
      event.preventDefault();
      wc.setZoomLevel(0);
    } else if (
      input.key === "F5" ||
      ((input.control || input.meta) && input.key.toLowerCase() === "r")
    ) {
      event.preventDefault();
      wc.reload();
    }
  });

  // send config when page loads
  wc.on("did-finish-load", () => config.sync());

  // configure spellchecker context menu
  wc.on("context-menu", (_, params) => {
    const menu = new Menu();

    for (const suggestion of params.dictionarySuggestions) {
      menu.append(
        new MenuItem({
          label: suggestion,
          click: () => wc.replaceMisspelling(suggestion),
        }),
      );
    }

    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: "Add to dictionary",
          click: () =>
            wc.session.addWordToSpellCheckerDictionary(params.misspelledWord),
        }),
      );
    }

    menu.append(
      new MenuItem({
        label: "Toggle spellcheck",
        click() {
          config.spellchecker = !config.spellchecker;
        },
      }),
    );

    if (menu.items.length > 0) {
      menu.popup();
    }
  });
}

/**
 * Create a WebContentsView for an instance
 */
function createInstanceView(instance: Instance): WebContentsView {
  const view = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  // Track the origin for navigation guards
  try {
    const origin = new URL(instance.url).origin;
    webContentsOriginMap.set(view.webContents.id, origin);
  } catch {
    webContentsOriginMap.set(view.webContents.id, instance.url);
  }

  configureInstanceView(view);
  view.webContents.loadURL(instance.url);

  return view;
}

/**
 * Switch to a specific instance
 */
export function switchToInstance(id: string) {
  if (!instanceViews.has(id)) return;
  activeInstanceId = id;
  config.activeInstanceId = id;
  layoutViews();

  // Notify sidebar of the change
  try {
    sidebarView?.webContents.send("instances-changed", {
      instances: config.instances,
      activeInstanceId: id,
    });
  } catch {
    // sidebar may not exist
  }
}

/**
 * Add a new instance
 */
export function addInstance(instance: Instance) {
  const instances = [...config.instances, instance];
  config.instances = instances;

  const view = createInstanceView(instance);
  instanceViews.set(instance.id, view);
  mainWindow.contentView.addChildView(view);

  // Re-raise sidebarView so it stays on top
  if (sidebarView) {
    mainWindow.contentView.removeChildView(sidebarView);
    mainWindow.contentView.addChildView(sidebarView);
  }

  // Switch to the new instance
  switchToInstance(instance.id);
}

/**
 * Remove an instance
 */
export function removeInstance(id: string) {
  const view = instanceViews.get(id);
  if (!view) return;

  // Clean up
  webContentsOriginMap.delete(view.webContents.id);
  mainWindow.contentView.removeChildView(view);
  (view.webContents as { destroy?(): void }).destroy?.();
  instanceViews.delete(id);

  // Update config
  const instances = config.instances.filter((i) => i.id !== id);
  config.instances = instances;

  // Switch to another instance if the active one was removed
  if (activeInstanceId === id && instances.length > 0) {
    switchToInstance(instances[0].id);
  }
}

/**
 * Edit an existing instance
 */
export function editInstance(id: string, label: string, url: string) {
  const instances = config.instances.map((i) =>
    i.id === id ? { ...i, label, url } : i,
  );
  config.instances = instances;

  // If URL changed, reload the view
  const view = instanceViews.get(id);
  const existing = config.instances.find((i) => i.id === id);
  if (view && existing) {
    const oldOrigin = webContentsOriginMap.get(view.webContents.id);
    const newOrigin = new URL(url).origin;
    if (oldOrigin !== newOrigin) {
      webContentsOriginMap.set(view.webContents.id, newOrigin);
      view.webContents.loadURL(url);
    }
  }
}

/**
 * Open the instance manager dialog
 */
let instanceManagerWindow: BrowserWindow | null = null;

export function getInstanceManagerWindow() {
  return instanceManagerWindow;
}

export function openInstanceManager() {
  if (instanceManagerWindow && !instanceManagerWindow.isDestroyed()) {
    instanceManagerWindow.focus();
    return;
  }

  instanceManagerWindow = new BrowserWindow({
    width: 500,
    height: 450,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    backgroundColor: "#1e1e1e",
    icon: windowIcon,
    frame: true,
    webPreferences: {
      preload: join(__dirname, "instance-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  instanceManagerWindow.setMenu(null);

  // Load from the built renderer output
  if (INSTANCE_MANAGER_VITE_DEV_SERVER_URL) {
    instanceManagerWindow.loadURL(INSTANCE_MANAGER_VITE_DEV_SERVER_URL);
  } else {
    instanceManagerWindow.loadFile(
      join(__dirname, `../renderer/instance_manager/instance-manager.html`),
    );
  }

  instanceManagerWindow.on("closed", () => {
    instanceManagerWindow = null;
  });
}

/**
 * Create the main application window
 */
export function createMainWindow() {
  // (CLI arg --hidden or config)
  const startHidden =
    app.commandLine.hasSwitch("hidden") || config.startMinimisedToTray;

  // create the window
  //
  // macOS: when using a custom frame, use titlebarStyle:'hidden' so the
  // native traffic-light buttons are preserved but the title bar is hidden.
  // The content view fills the full window; traffic lights are rendered as
  // an overlay. We add left-padding in the titlebar renderer to clear them.
  //
  // Windows / Linux: use frame:false for a fully custom chrome, or
  // frame:true when the user opts out of the custom frame.
  const isMac = process.platform === "darwin";
  mainWindow = new BrowserWindow({
    minWidth: 300,
    minHeight: 300,
    width: 1280,
    height: 720,
    backgroundColor: "#191919",
    ...(isMac && config.customFrame
      ? { titlebarStyle: "hidden", trafficLightPosition: { x: 12, y: 10 } }
      : { frame: !config.customFrame }),
    icon: windowIcon,
    show: !startHidden,
  });

  // hide the options menu
  mainWindow.setMenu(null);

  // restore last position if it was moved previously
  if (config.windowState.x > 0 || config.windowState.y > 0) {
    mainWindow.setPosition(
      config.windowState.x ?? 0,
      config.windowState.y ?? 0,
    );
  }

  // restore last size if it was resized previously
  if (config.windowState.width > 0 && config.windowState.height > 0) {
    mainWindow.setSize(
      config.windowState.width ?? 1280,
      config.windowState.height ?? 720,
    );
  }

  // maximise the window if it was maximised before
  if (config.windowState.isMaximised) {
    mainWindow.maximize();
  }

  // Create the sidebar view
  sidebarView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, "sidebar-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load sidebar content
  if (SIDEBAR_VITE_DEV_SERVER_URL) {
    sidebarView.webContents.loadURL(SIDEBAR_VITE_DEV_SERVER_URL);
  } else {
    sidebarView.webContents.loadFile(
      join(__dirname, `../renderer/sidebar/index.html`),
    );
  }

  // Handle force-server CLI arg: override default instance URL
  if (app.commandLine.hasSwitch("force-server")) {
    const forcedUrl = app.commandLine.getSwitchValue("force-server");
    const instances = config.instances;
    if (instances.length > 0) {
      instances[0].url = forcedUrl;
      config.instances = instances;
    }
  }

  // Create views for all configured instances
  const instances = config.instances;
  for (const instance of instances) {
    const view = createInstanceView(instance);
    instanceViews.set(instance.id, view);
    mainWindow.contentView.addChildView(view);
  }

  // Add sidebarView LAST so it sits on top of instance views in z-order
  mainWindow.contentView.addChildView(sidebarView);

  // Set the active instance
  const savedActiveId = config.activeInstanceId;
  activeInstanceId = instanceViews.has(savedActiveId)
    ? savedActiveId
    : (instances[0]?.id ?? null);

  // Initial layout
  layoutViews();

  // Relayout on resize.
  // will-resize is macOS/Windows only and does not fire on Linux.
  // resize fires at the end of a drag on Linux/GTK; setImmediate ensures
  // Electron has committed the new bounds before we read them.
  mainWindow.on("resize", () => setImmediate(layoutViews));

  // Register instance-switching keyboard shortcuts when window is focused
  function registerShortcuts() {
    for (let i = 1; i <= 9; i++) {
      const idx = i - 1;
      globalShortcut.register(`CommandOrControl+${i}`, () => {
        const inst = config.instances;
        if (idx < inst.length) switchToInstance(inst[idx].id);
      });
    }
    globalShortcut.register("CommandOrControl+Tab", () => {
      const inst = config.instances;
      if (inst.length <= 1) return;
      const cur = inst.findIndex((i) => i.id === activeInstanceId);
      switchToInstance(inst[(cur + 1) % inst.length].id);
    });
    globalShortcut.register("CommandOrControl+Shift+Tab", () => {
      const inst = config.instances;
      if (inst.length <= 1) return;
      const cur = inst.findIndex((i) => i.id === activeInstanceId);
      switchToInstance(inst[(cur - 1 + inst.length) % inst.length].id);
    });
  }

  function unregisterShortcuts() {
    for (let i = 1; i <= 9; i++)
      globalShortcut.unregister(`CommandOrControl+${i}`);
    globalShortcut.unregister("CommandOrControl+Tab");
    globalShortcut.unregister("CommandOrControl+Shift+Tab");
  }

  mainWindow.on("focus", registerShortcuts);
  mainWindow.on("blur", unregisterShortcuts);

  // minimise window to tray
  mainWindow.on("close", (event) => {
    if (!shouldQuit && config.minimiseToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // update tray menu when window is shown/hidden
  mainWindow.on("show", updateTrayMenu);
  mainWindow.on("hide", updateTrayMenu);

  // keep track of window state
  function generateState() {
    config.windowState = {
      x: mainWindow.getPosition()[0],
      y: mainWindow.getPosition()[1],
      width: mainWindow.getSize()[0],
      height: mainWindow.getSize()[1],
      isMaximised: mainWindow.isMaximized(),
    };
  }

  mainWindow.on("maximize", generateState);
  mainWindow.on("unmaximize", generateState);
  mainWindow.on("moved", generateState);
  mainWindow.on("resized", generateState);

  // push world events to the window
  ipcMain.on("minimise", () => mainWindow.minimize());
  ipcMain.on("maximise", () =>
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(),
  );
  ipcMain.on("close", () => mainWindow.close());

  // Instance management IPC handlers
  ipcMain.handle("get-instances", () => ({
    instances: config.instances,
    activeInstanceId,
  }));

  ipcMain.on("switch-instance", (_, id: string) => {
    switchToInstance(id);
  });

  ipcMain.on("open-instance-manager", () => {
    openInstanceManager();
  });

  ipcMain.on("add-instance", (_, data: { label: string; url: string }) => {
    const id = `instance-${Date.now()}`;
    addInstance({ id, label: data.label, url: data.url });
  });

  ipcMain.on(
    "edit-instance",
    (_, data: { id: string; label: string; url: string }) => {
      editInstance(data.id, data.label, data.url);
    },
  );

  ipcMain.on("remove-instance", (_, id: string) => {
    removeInstance(id);
  });

  ipcMain.on("close-instance-manager", () => {
    instanceManagerWindow?.close();
  });
}

/**
 * Quit the entire app
 */
export function quitApp() {
  shouldQuit = true;
  mainWindow.close();
}

// Ensure global app quit works properly
app.on("before-quit", () => {
  shouldQuit = true;
  globalShortcut.unregisterAll();
});

// Vite dev server URL declarations
declare const SIDEBAR_VITE_DEV_SERVER_URL: string | undefined;
declare const INSTANCE_MANAGER_VITE_DEV_SERVER_URL: string | undefined;
