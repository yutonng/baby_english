let drafts = [];
let published = [];
let selectedId = "";
let selectedSource = "draft";

const draftList = document.querySelector("#draftList");
const publishedList = document.querySelector("#publishedList");
const sceneForm = document.querySelector("#sceneForm");
const sceneTitle = document.querySelector("#sceneTitle");
const statusText = document.querySelector("#statusText");
const wordPreview = document.querySelector("#wordPreview");
const message = document.querySelector("#message");
const adminTokenKey = "little-english-admin-token";

function showMessage(text) {
  message.textContent = text;
}

async function requestJson(url, options = {}) {
  const adminToken = localStorage.getItem(adminTokenKey) || "";
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(adminToken ? { authorization: `Bearer ${adminToken}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json();
  if (response.status === 401) {
    const token = window.prompt("请输入后台管理员 Token");
    if (token) {
      localStorage.setItem(adminTokenKey, token);
      return requestJson(url, options);
    }
  }
  if (!response.ok) {
    throw new Error(payload.error || "请求失败");
  }
  return payload;
}

function getSelectedDraft() {
  return drafts.find((scene) => scene.id === selectedId) || null;
}

function getSelectedScene() {
  if (selectedSource === "published") {
    return published.find((scene) => scene.id === selectedId) || null;
  }

  return getSelectedDraft();
}

function renderList() {
  draftList.innerHTML = drafts
    .map(
      (scene) => `
        <button class="scene-button ${selectedSource === "draft" && scene.id === selectedId ? "is-active" : ""}" type="button" data-draft="${scene.id}">
          ${scene.icon || ""} ${scene.title || scene.id} · ${scene.status}
        </button>
      `
    )
    .join("");

  publishedList.innerHTML = published
    .map(
      (scene) => `
        <button class="scene-button ${selectedSource === "published" && scene.id === selectedId ? "is-active" : ""}" type="button" data-published="${scene.id}">
          ${scene.icon || ""} ${scene.title || scene.id}
        </button>
      `
    )
    .join("");
}

function renderEditor() {
  const scene = getSelectedScene();
  if (!scene) {
    sceneForm.innerHTML = "";
    sceneTitle.textContent = "单词与例句";
    statusText.textContent = "请选择一个场景";
    wordPreview.innerHTML = "";
    return;
  }

  sceneTitle.textContent = `${scene.title || "未命名"} / ${scene.subtitle || "Untitled"}`;
  statusText.textContent = selectedSource === "published" ? "已发布内容，复制为草稿后可编辑" : `草稿：${scene.status}`;
  renderSceneForm(scene);
  renderWordPreview(scene);
}

function isEditable() {
  return selectedSource === "draft";
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderSceneForm(scene) {
  const disabled = isEditable() ? "" : "disabled";
  sceneForm.innerHTML = `
    <label>
      <span>中文名</span>
      <input type="text" data-scene-field="title" value="${escapeAttr(scene.title)}" ${disabled} />
    </label>
    <label>
      <span>英文名</span>
      <input type="text" data-scene-field="subtitle" value="${escapeAttr(scene.subtitle)}" ${disabled} />
    </label>
    <label>
      <span>图标</span>
      <input type="text" data-scene-field="icon" value="${escapeAttr(scene.icon)}" ${disabled} />
    </label>
    <label>
      <span>颜色 A</span>
      <input type="text" data-color-index="0" value="${escapeAttr(scene.colors?.[0] || "")}" ${disabled} />
    </label>
    <label>
      <span>颜色 B</span>
      <input type="text" data-color-index="1" value="${escapeAttr(scene.colors?.[1] || "")}" ${disabled} />
    </label>
  `;
}

function getImageSource(word) {
  if (!word.image) return "";
  if (typeof word.image === "string") return word.image;
  return word.image.url || (word.image.storageKey ? `/uploads/${word.image.storageKey}` : "");
}

function getImageStatus(word) {
  if (!word.image) return "pending";
  if (typeof word.image === "string") return "published";
  return `${word.image.status || "pending"} · v${word.image.version || 1}`;
}

function renderWordPreview(scene) {
  const disabled = isEditable() ? "" : "disabled";
  wordPreview.innerHTML = (scene.words || [])
    .map((word, index) => {
      const src = getImageSource(word);
      return `
        <div class="word-preview-item">
          <div class="word-preview-media">
            ${src ? `<img src="${src}" alt="" />` : `<span>${word.picture || ""}</span>`}
          </div>
          <div class="word-preview-copy">
            <div class="word-fields">
              <label>
                <span>单词</span>
                <input type="text" data-word-index="${index}" data-word-field="word" value="${escapeAttr(word.word)}" ${disabled} />
              </label>
              <label>
                <span>中文</span>
                <input type="text" data-word-index="${index}" data-word-field="cn" value="${escapeAttr(word.cn)}" ${disabled} />
              </label>
              <label class="sentence-field">
                <span>例句</span>
                <input type="text" data-word-index="${index}" data-word-field="sentence" value="${escapeAttr(word.sentence)}" ${disabled} />
              </label>
            </div>
            <small>${getImageStatus(word)}</small>
          </div>
        </div>
      `;
    })
    .join("");
}

function updateSceneField(target) {
  if (!isEditable()) return;
  const scene = getSelectedDraft();
  if (!scene) return;

  const sceneField = target.dataset.sceneField;
  const colorIndex = target.dataset.colorIndex;
  const wordIndex = target.dataset.wordIndex;
  const wordField = target.dataset.wordField;

  if (sceneField) {
    scene[sceneField] = target.value;
  } else if (colorIndex !== undefined) {
    if (!Array.isArray(scene.colors)) scene.colors = ["", ""];
    scene.colors[Number(colorIndex)] = target.value;
  } else if (wordIndex !== undefined && wordField) {
    const word = scene.words[Number(wordIndex)];
    if (word) word[wordField] = target.value;
  }

  scene.updatedAt = new Date().toISOString();
  renderList();
  sceneTitle.textContent = `${scene.title || "未命名"} / ${scene.subtitle || "Untitled"}`;
}

async function loadContent() {
  const content = await requestJson("/api/content");
  drafts = content.drafts || [];
  published = content.published || [];
  if (!selectedId && drafts[0]) {
    selectedId = drafts[0].id;
    selectedSource = "draft";
  } else if (!selectedId && published[0]) {
    selectedId = published[0].id;
    selectedSource = "published";
  }
  renderList();
  renderEditor();
}

async function saveDraft() {
  if (selectedSource !== "draft") throw new Error("已发布场景不能在这里保存为草稿");
  const scene = getSelectedDraft();
  if (!scene) throw new Error("请选择草稿后再保存");
  if (!scene.id) throw new Error("草稿缺少 id");

  const existing = drafts.find((item) => item.id === scene.id);
  const saved = existing
    ? await requestJson(`/api/scenes/drafts/${encodeURIComponent(scene.id)}`, {
        method: "PUT",
        body: JSON.stringify(scene),
      })
    : await requestJson("/api/scenes/drafts", {
        method: "POST",
        body: JSON.stringify(scene),
      });

  selectedId = saved.id;
  await loadContent();
  showMessage("草稿已保存");
}

async function approveDraft() {
  if (selectedSource !== "draft") throw new Error("请选择草稿后再审核发布");
  const scene = getSelectedDraft();
  if (!scene) throw new Error("请选择草稿后再审核发布");
  if (!scene.id) throw new Error("草稿缺少 id");
  await saveDraft();
  await requestJson(`/api/scenes/drafts/${encodeURIComponent(scene.id)}/approve`, {
    method: "POST",
    body: "{}",
  });
  await loadContent();
  showMessage("已审核通过，并发布到 App 数据");
}

function publishedWordToDraftWord(word) {
  return {
    word: word.word || "",
    cn: word.cn || "",
    picture: word.picture || "",
    sentence: word.sentence || "",
    image: {
      status: word.image ? "ready" : "pending",
      storageKey: "",
      url: word.image || "",
      prompt: "",
      version: word.imageVersion || 1,
      width: null,
      height: null,
    },
  };
}

function copySelectedPublishedToDraft() {
  if (selectedSource !== "published") {
    showMessage("请选择一个已发布场景");
    return;
  }

  const scene = getSelectedScene();
  if (!scene) {
    showMessage("请选择一个已发布场景");
    return;
  }

  const draft = {
    ...scene,
    status: "draft",
    words: (scene.words || []).map(publishedWordToDraftWord),
    notes: "Copied from published content for editing.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIndex = drafts.findIndex((item) => item.id === draft.id);
  if (existingIndex >= 0) {
    drafts[existingIndex] = draft;
  } else {
    drafts.push(draft);
  }

  selectedId = draft.id;
  selectedSource = "draft";
  renderList();
  renderEditor();
  showMessage("已复制为草稿，可以编辑后保存");
}

function createDraftTemplate() {
  const id = `scene-${Date.now()}`;
  selectedId = id;
  selectedSource = "draft";
  const scene = {
    id,
    title: "新场景",
    subtitle: "New Scene",
    icon: "📘",
    colors: ["#ffe3a3", "#bfe7ff"],
    status: "draft",
    words: [
      {
        word: "sample",
        cn: "示例",
        picture: "📘",
        sentence: "This is a sample.",
        image: {
          status: "pending",
          storageKey: "",
          url: "",
          prompt: "Use case: illustration-story\nAsset type: child learning word sticker\nPrimary request: sample",
          version: 1,
          width: null,
          height: null
        }
      }
    ]
  };
  drafts.push(scene);
  renderList();
  renderEditor();
  showMessage("已创建本地草稿，保存后进入后端");
}

draftList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-draft]");
  if (!button) return;
  selectedId = button.dataset.draft;
  selectedSource = "draft";
  renderList();
  renderEditor();
});

publishedList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-published]");
  if (!button) return;
  selectedId = button.dataset.published;
  selectedSource = "published";
  renderList();
  renderEditor();
});

document.querySelector("#refreshButton").addEventListener("click", () => {
  loadContent().catch((error) => showMessage(error.message));
});

document.querySelector("#newDraftButton").addEventListener("click", createDraftTemplate);
document.querySelector("#copyPublishedButton").addEventListener("click", copySelectedPublishedToDraft);
document.querySelector("#saveButton").addEventListener("click", () => {
  saveDraft().catch((error) => showMessage(error.message));
});
document.querySelector("#approveButton").addEventListener("click", () => {
  approveDraft().catch((error) => showMessage(error.message));
});

sceneForm.addEventListener("input", (event) => updateSceneField(event.target));
wordPreview.addEventListener("input", (event) => updateSceneField(event.target));

loadContent().catch((error) => showMessage(error.message));
