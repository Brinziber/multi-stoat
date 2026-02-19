import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("sidebarAPI", {
  /** The current platform: 'linux' | 'win32' | 'darwin' */
  platform: process.platform,
  getInstances() {
    return ipcRenderer.invoke("get-instances");
  },
  switchInstance(id: string) {
    ipcRenderer.send("switch-instance", id);
  },
  openInstanceManager() {
    ipcRenderer.send("open-instance-manager");
  },
  minimise() {
    ipcRenderer.send("minimise");
  },
  maximise() {
    ipcRenderer.send("maximise");
  },
  close() {
    ipcRenderer.send("close");
  },
  onInstancesChanged(
    callback: (data: {
      instances: Instance[];
      activeInstanceId: string;
    }) => void,
  ) {
    ipcRenderer.on("instances-changed", (_, data) => callback(data));
  },
});
