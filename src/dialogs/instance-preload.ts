import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("instanceManagerAPI", {
  getInstances() {
    return ipcRenderer.invoke("get-instances");
  },
  addInstance(label: string, url: string) {
    ipcRenderer.send("add-instance", { label, url });
  },
  editInstance(id: string, label: string, url: string) {
    ipcRenderer.send("edit-instance", { id, label, url });
  },
  removeInstance(id: string) {
    ipcRenderer.send("remove-instance", id);
  },
  onInstancesChanged(
    callback: (data: {
      instances: Instance[];
      activeInstanceId: string;
    }) => void,
  ) {
    ipcRenderer.on("instances-changed", (_, data) => callback(data));
  },
  close() {
    ipcRenderer.send("close-instance-manager");
  },
});
