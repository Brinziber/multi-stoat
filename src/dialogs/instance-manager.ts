import "./instance-manager.css";

interface InstanceManagerAPI {
  getInstances(): Promise<{ instances: Instance[]; activeInstanceId: string }>;
  addInstance(label: string, url: string): void;
  editInstance(id: string, label: string, url: string): void;
  removeInstance(id: string): void;
  onInstancesChanged(
    callback: (data: {
      instances: Instance[];
      activeInstanceId: string;
    }) => void,
  ): void;
  close(): void;
}

declare const instanceManagerAPI: InstanceManagerAPI;

const instanceList = document.getElementById("instance-list") as HTMLDivElement;
const addForm = document.getElementById("add-form") as HTMLDivElement;
const formTitle = document.getElementById("form-title") as HTMLHeadingElement;
const labelInput = document.getElementById("label-input") as HTMLInputElement;
const urlInput = document.getElementById("url-input") as HTMLInputElement;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const cancelBtn = document.getElementById("cancel-btn") as HTMLButtonElement;
const addNewBtn = document.getElementById("add-new-btn") as HTMLButtonElement;

let editingId: string | null = null;

function renderInstances(instances: Instance[]) {
  instanceList.innerHTML = "";

  instances.forEach((instance) => {
    const item = document.createElement("div");
    item.className = "instance-item";

    item.innerHTML = `
      <div class="instance-info">
        <div class="instance-label">${escapeHtml(instance.label)}</div>
        <div class="instance-url">${escapeHtml(instance.url)}</div>
      </div>
      <div class="instance-actions">
        <button class="icon-btn edit" title="Edit">✎</button>
        ${instances.length > 1 ? `<button class="icon-btn delete" title="Delete">✕</button>` : ""}
      </div>
    `;

    const editBtn = item.querySelector(".edit") as HTMLButtonElement;
    editBtn.addEventListener("click", () => {
      editingId = instance.id;
      formTitle.textContent = "Edit Instance";
      labelInput.value = instance.label;
      urlInput.value = instance.url;
      addForm.classList.add("visible");
      addNewBtn.style.display = "none";
    });

    const deleteBtn = item.querySelector(".delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm(`Remove "${instance.label}"?`)) {
          instanceManagerAPI.removeInstance(instance.id);
        }
      });
    }

    instanceList.appendChild(item);
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function resetForm() {
  editingId = null;
  formTitle.textContent = "Add Instance";
  labelInput.value = "";
  urlInput.value = "";
  addForm.classList.remove("visible");
  addNewBtn.style.display = "";
}

addNewBtn.addEventListener("click", () => {
  resetForm();
  addForm.classList.add("visible");
  addNewBtn.style.display = "none";
  labelInput.focus();
});

cancelBtn.addEventListener("click", resetForm);

saveBtn.addEventListener("click", () => {
  const label = labelInput.value.trim();
  let url = urlInput.value.trim();

  if (!label || !url) return;

  // Ensure URL has protocol
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  try {
    new URL(url); // Validate URL
  } catch {
    urlInput.style.borderColor = "#ed4245";
    return;
  }

  if (editingId) {
    instanceManagerAPI.editInstance(editingId, label, url);
  } else {
    instanceManagerAPI.addInstance(label, url);
  }

  resetForm();
});

// Initial load
instanceManagerAPI.getInstances().then(({ instances }) => {
  renderInstances(instances);
});

// Listen for updates
instanceManagerAPI.onInstancesChanged(({ instances }) => {
  renderInstances(instances);
});
