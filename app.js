let scenes = [];
const sceneCacheKey = "little-english-published-scenes";

function getContentApiBase() {
  return (window.CONTENT_API_BASE || "").replace(/\/$/, "");
}

function normalizeRemoteImageUrl(imageUrl) {
  if (!imageUrl || /^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("./") || imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  return `${getContentApiBase()}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

function normalizeSceneImages(items) {
  return items.map((scene) => ({
    ...scene,
    words: (scene.words || []).map((word) => ({
      ...word,
      image: normalizeRemoteImageUrl(word.image),
    })),
  }));
}

function readCachedScenes() {
  try {
    const cached = JSON.parse(localStorage.getItem(sceneCacheKey) || "[]");
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
}

async function loadPublishedScenes() {
  try {
    const response = await fetch(`${getContentApiBase()}/api/scenes/published`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Scene data request failed: ${response.status}`);
    const loadedScenes = normalizeSceneImages(await response.json());
    if (!Array.isArray(loadedScenes) || loadedScenes.length === 0) {
      throw new Error("Scene data is empty");
    }
    localStorage.setItem(sceneCacheKey, JSON.stringify(loadedScenes));
    return loadedScenes;
  } catch (error) {
    console.error(error);
    const cachedScenes = readCachedScenes();
    if (cachedScenes.length > 0) return cachedScenes;
  }

  try {
    const response = await fetch("./data/scenes.published.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Bundled scene data request failed: ${response.status}`);
    return normalizeSceneImages(await response.json());
  } catch (error) {
    console.error(error);
    return [];
  }
}

const homeView = document.querySelector("#homeView");
const sceneView = document.querySelector("#sceneView");
const sceneGrid = document.querySelector("#sceneGrid");
const wordGrid = document.querySelector("#wordGrid");
const backButton = document.querySelector("#backButton");
const sceneTitle = document.querySelector("#sceneTitle");
const sceneSubtitle = document.querySelector("#sceneSubtitle");
const wordSheet = document.querySelector("#wordSheet");
const scrim = document.querySelector("#scrim");
const closeSheet = document.querySelector("#closeSheet");
const sheetPicture = document.querySelector("#sheetPicture");
const sheetWord = document.querySelector("#sheetWord");
const sheetSentence = document.querySelector("#sheetSentence");
const wordSoundButton = document.querySelector("#wordSoundButton");
const wordSoundText = document.querySelector("#wordSoundText");
const sentenceSoundButton = document.querySelector("#sentenceSoundButton");
const audioToast = document.querySelector("#audioToast");

const AppEnv = Object.freeze({
  buildType: window.APP_BUILD_TYPE || "web",
  get isDebugApp() {
    return this.buildType === "debug";
  },
  get isReleaseApp() {
    return this.buildType === "release";
  },
  get isWeb() {
    return this.buildType === "web";
  },
});

let currentScene = null;
let currentWord = null;
let voices = [];
let activeUtterance = null;
let activeAudio = null;
let audioToastTimer = null;
let isRestoringHistory = false;

function renderScenes() {
  if (scenes.length === 0) {
    sceneGrid.innerHTML = "<p>还没有可用场景。</p>";
    return;
  }

  sceneGrid.innerHTML = scenes
    .map(
      (scene) => `
        <button class="scene-card" type="button" data-scene="${scene.id}" style="--accent-a: ${scene.colors[0]}; --accent-b: ${scene.colors[1]}">
          <span class="scene-art" aria-hidden="true">${scene.icon}</span>
          <span>
            <h3>${scene.title}</h3>
            <p>${scene.subtitle} · ${scene.words.length} words</p>
          </span>
          <span class="scene-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </button>
      `
    )
    .join("");
}

function renderPicture(item) {
  if (item.image) {
    return `<img src="${item.image}" alt="" />`;
  }

  return item.picture;
}

function renderWords(scene) {
  sceneTitle.textContent = scene.title;
  sceneSubtitle.textContent = scene.subtitle;
  wordGrid.innerHTML = scene.words
    .map(
      (item, index) => `
        <button class="word-card" type="button" data-word="${index}" style="--accent-a: ${scene.colors[0]}; --accent-b: ${scene.colors[1]}">
          <span class="picture-frame" aria-hidden="true">${renderPicture(item)}</span>
          <strong>${item.word}</strong>
          <span>${item.cn}</span>
        </button>
      `
    )
    .join("");
}

function showScene(sceneId, options = {}) {
  currentScene = scenes.find((scene) => scene.id === sceneId) || scenes[0];
  if (!currentScene) return;
  renderWords(currentScene);
  homeView.classList.add("is-hidden");
  sceneView.classList.remove("is-hidden");
  if (!options.skipHistory) {
    history.pushState({ view: "scene", sceneId: currentScene.id }, "", `#${currentScene.id}`);
  }
  window.scrollTo(0, 0);
}

function showHome(options = {}) {
  closeWordSheet();
  sceneView.classList.add("is-hidden");
  homeView.classList.remove("is-hidden");
  if (!options.skipHistory) {
    history.pushState({ view: "home" }, "", location.pathname);
  }
}

function getEnglishVoice() {
  const preferred = voices.find((voice) => voice.lang === "en-US" && /female|samantha|victoria|ava/i.test(voice.name));
  return preferred || voices.find((voice) => voice.lang === "en-US") || voices.find((voice) => voice.lang.startsWith("en")) || null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getAudioUrl(text, kind) {
  if (!kind) return "";
  return `./audio/${kind}/${slugify(text)}.mp3`;
}

function showAudioMessage(message) {
  audioToast.textContent = message;
  audioToast.classList.remove("is-hidden");
  window.clearTimeout(audioToastTimer);
  audioToastTimer = window.setTimeout(() => audioToast.classList.add("is-hidden"), 2600);
}

function canUseSpeech() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function refreshVoices() {
  if (!canUseSpeech()) return [];
  voices = window.speechSynthesis.getVoices() || [];
  return voices;
}

function waitForVoices(timeout = 900) {
  refreshVoices();
  if (voices.length > 0) return Promise.resolve(voices);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      refreshVoices();
      if (voices.length > 0 || Date.now() - startedAt > timeout) {
        window.clearInterval(timer);
        resolve(voices);
      }
    }, 120);
  });
}

function playLocalAudio(text, target, kind) {
  const audioUrl = getAudioUrl(text, kind);
  if (!audioUrl) return Promise.reject(new Error("No local audio path"));

  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }

  activeAudio = new Audio(audioUrl);
  activeAudio.preload = "auto";
  activeAudio.playbackRate = 1;

  if (target) target.classList.add("is-speaking");

  return new Promise((resolve, reject) => {
    activeAudio.addEventListener("ended", () => {
      target?.classList.remove("is-speaking");
      resolve();
    }, { once: true });

    activeAudio.addEventListener("error", () => {
      target?.classList.remove("is-speaking");
      reject(new Error("Local audio failed"));
    }, { once: true });

    activeAudio.play().catch((error) => {
      target?.classList.remove("is-speaking");
      reject(error);
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function speak(text, target, kind, retried = false) {
  document.querySelectorAll(".is-speaking").forEach((item) => item.classList.remove("is-speaking"));

  try {
    await playLocalAudio(text, target, kind);
    return;
  } catch {
    activeAudio = null;
  }

  if (!canUseSpeech()) {
    showAudioMessage("这个浏览器不能播放朗读。请确认音频文件已部署，或换 Chrome/Safari 试试。");
    return;
  }

  await waitForVoices();

  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = text.split(" ").length > 2 ? 0.78 : 0.82;
  utterance.pitch = 1.08;

  const voice = getEnglishVoice();
  if (voice) utterance.voice = voice;

  if (target) target.classList.add("is-speaking");
  activeUtterance = utterance;

  return new Promise((resolve) => {
    utterance.onend = () => {
      target?.classList.remove("is-speaking");
      resolve();
    };
    utterance.onerror = () => {
      target?.classList.remove("is-speaking");
      if (!retried) {
        window.setTimeout(() => {
          speak(text, target, kind, true).finally(resolve);
        }, 180);
        return;
      }
      showAudioMessage("朗读没有启动。请确认音频文件已部署，或换 Chrome/Safari 试试。");
      resolve();
    };

    window.speechSynthesis.speak(utterance);

    window.setTimeout(() => {
      const synth = window.speechSynthesis;
      if (!retried && !synth.speaking && !synth.pending) {
        speak(text, target, kind, true).finally(resolve);
      }
    }, 280);
  });
}

function openWordSheet(item, scene, options = {}) {
  if (!item || !scene) return;
  currentWord = item;

  sheetPicture.innerHTML = renderPicture(item);
  sheetPicture.style.setProperty("--accent-a", scene.colors[0]);
  sheetPicture.style.setProperty("--accent-b", scene.colors[1]);
  sheetWord.textContent = item.word;
  wordSoundText.textContent = item.word;
  sheetSentence.textContent = item.sentence;
  wordSheet.classList.remove("is-hidden");
  scrim.classList.remove("is-hidden");
  if (!options.skipHistory) {
    history.pushState(
      { view: "word", sceneId: scene.id, word: item.word },
      "",
      `#${scene.id}/${slugify(item.word)}`
    );
  }
  speak(item.word, wordSoundButton, "words");
}

function closeWordSheet(options = {}) {
  wordSheet.classList.add("is-hidden");
  scrim.classList.add("is-hidden");
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  window.speechSynthesis?.cancel();
  activeAudio = null;
  activeUtterance = null;
  document.querySelectorAll(".is-speaking").forEach((item) => item.classList.remove("is-speaking"));
  if (!options.skipHistory && !isRestoringHistory) {
    history.back();
  }
}

function loadVoices() {
  refreshVoices();
}

function primeSpeech() {
  if (!canUseSpeech()) return;
  refreshVoices();
  window.speechSynthesis.resume();
}

function handleAppBack() {
  if (!wordSheet.classList.contains("is-hidden") || !sceneView.classList.contains("is-hidden")) {
    history.back();
    return true;
  }

  return false;
}

async function initApp() {
  scenes = await loadPublishedScenes();
  currentScene = scenes[0] || null;
  currentWord = currentScene?.words?.[0] || null;

  renderScenes();
  loadVoices();
  history.replaceState({ view: "home" }, "", location.pathname);
  if (canUseSpeech() && typeof window.speechSynthesis.addEventListener === "function") {
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
  } else if (canUseSpeech()) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  document.addEventListener("pointerdown", primeSpeech, { once: true });
  window.littleEnglishHandleBack = handleAppBack;
}

sceneGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-scene]");
  if (!card) return;
  showScene(card.dataset.scene);
});

wordGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-word]");
  if (!card || !currentScene) return;
  const item = currentScene.words[Number(card.dataset.word)];
  openWordSheet(item, currentScene);
});

window.addEventListener("popstate", (event) => {
  const state = event.state || { view: "home" };
  isRestoringHistory = true;

  if (state.view === "word") {
    const scene = scenes.find((item) => item.id === state.sceneId) || scenes[0];
    if (!scene) return;
    const word = scene.words.find((item) => item.word === state.word) || scene.words[0];
    showScene(scene.id, { skipHistory: true });
    openWordSheet(word, scene, { skipHistory: true, skipVisit: true });
  } else if (state.view === "scene") {
    closeWordSheet({ skipHistory: true });
    showScene(state.sceneId, { skipHistory: true });
  } else {
    showHome({ skipHistory: true });
  }

  isRestoringHistory = false;
});

backButton.addEventListener("click", () => history.back());
closeSheet.addEventListener("click", () => closeWordSheet());
scrim.addEventListener("click", () => closeWordSheet());
wordSoundButton.addEventListener("click", () => currentWord && speak(currentWord.word, wordSoundButton, "words"));
sentenceSoundButton.addEventListener("click", () => currentWord && speak(currentWord.sentence, sentenceSoundButton, "sentences"));

initApp();
