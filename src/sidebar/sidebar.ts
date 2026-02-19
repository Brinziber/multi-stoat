import "./sidebar.css";

interface SidebarAPI {
  platform: string;
  getInstances(): Promise<{ instances: Instance[]; activeInstanceId: string }>;
  switchInstance(id: string): void;
  openInstanceManager(): void;
  minimise(): void;
  maximise(): void;
  close(): void;
  onInstancesChanged(
    callback: (data: {
      instances: Instance[];
      activeInstanceId: string;
    }) => void,
  ): void;
}

declare const sidebarAPI: SidebarAPI;

const tabsContainer = document.getElementById("tabs") as HTMLDivElement;
const addBtn = document.getElementById("add-btn") as HTMLButtonElement;
const minimiseBtn = document.getElementById(
  "minimise-btn",
) as HTMLButtonElement;
const maximiseBtn = document.getElementById(
  "maximise-btn",
) as HTMLButtonElement;
const closeBtn = document.getElementById("close-btn") as HTMLButtonElement;
const windowControls = document.getElementById(
  "window-controls",
) as HTMLDivElement;

// Platform-specific setup
if (sidebarAPI.platform === "darwin") {
  // macOS: native traffic-light buttons cover the left ~72px of the titlebar.
  // Hide our custom window controls (traffic lights handle minimise/maximise/close).
  // Add a CSS class that shifts content right to clear the traffic lights.
  document.body.classList.add("mac");
  windowControls.style.display = "none";
} else if (sidebarAPI.platform === "win32") {
  // Windows: show controls, but use Windows-style ordering (already correct).
  document.body.classList.add("win");
} else {
  document.body.classList.add("linux");
}

function renderTabs(instances: Instance[], activeInstanceId: string) {
  tabsContainer.innerHTML = "";

  // Always keep the add button visible
  addBtn.style.display = "";

  // Only render tabs when there is more than one instance
  if (instances.length <= 1) {
    return;
  }

  instances.forEach((instance, index) => {
    const tab = document.createElement("button");
    tab.className = "tab";
    if (instance.id === activeInstanceId) {
      tab.classList.add("active");
    }

    const dot = document.createElement("span");
    dot.className = "dot";
    tab.appendChild(dot);

    const label = document.createTextNode(instance.label);
    tab.appendChild(label);

    if (index < 9) {
      const shortcut = document.createElement("span");
      shortcut.className = "shortcut";
      shortcut.textContent = `Ctrl+${index + 1}`;
      tab.appendChild(shortcut);
    }

    tab.addEventListener("click", () => {
      sidebarAPI.switchInstance(instance.id);
    });

    tab.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      sidebarAPI.openInstanceManager();
    });

    tabsContainer.appendChild(tab);
  });
}

// Initial load
sidebarAPI.getInstances().then(({ instances, activeInstanceId }) => {
  renderTabs(instances, activeInstanceId);
});

// Listen for updates
sidebarAPI.onInstancesChanged(({ instances, activeInstanceId }) => {
  renderTabs(instances, activeInstanceId);
});

// Add instance
addBtn.addEventListener("click", () => {
  sidebarAPI.openInstanceManager();
});

// Window controls
minimiseBtn.addEventListener("click", () => sidebarAPI.minimise());
maximiseBtn.addEventListener("click", () => sidebarAPI.maximise());
closeBtn.addEventListener("click", () => sidebarAPI.close());
