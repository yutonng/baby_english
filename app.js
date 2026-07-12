let scenes = [];
const sceneCacheKey = "little-english-published-scenes-v3";
const SCENE_ICON_BY_ID = {
  "living-room": "🛋️",
  kindergarten: "🎒",
  hotel: "🏨",
  airport: "✈️",
  "train-station": "🚉",
};
const languageSettingsKey = "little-english-language-settings";
const APP_VERSION = "0.1.0";
const SUPPORTED_LANGUAGES = [
  { code: "zh-CN", label: "中文" },
  { code: "en-US", label: "English" },
  { code: "ja-JP", label: "日本語" },
];
const UI_TEXT = {
  "zh-CN": {
    settings: "设置",
    version: "版本号",
    sourceLanguage: "源语言",
    targetLanguage: "目标语言",
    privacy: "隐私协议",
    searchPlaceholder: "搜索场景或单词",
    emptyScenes: "还没有可用场景。",
    noSearchResults: "没有找到对应内容。",
    audioUnavailable: "这个浏览器不能播放朗读。请确认音频文件已部署，或换 Chrome/Safari 试试。",
    speechFailed: "朗读暂时不可用，请再试一次。",
  },
  "en-US": {
    settings: "Settings",
    version: "Version",
    sourceLanguage: "Source language",
    targetLanguage: "Target language",
    privacy: "Privacy Policy",
    searchPlaceholder: "Search scenes or words",
    emptyScenes: "No scenes yet.",
    noSearchResults: "No matching content.",
    audioUnavailable: "This browser cannot play speech. Please check audio files or try Chrome/Safari.",
    speechFailed: "Speech is temporarily unavailable. Please try again.",
  },
  "ja-JP": {
    settings: "設定",
    version: "バージョン",
    sourceLanguage: "母語",
    targetLanguage: "学習言語",
    privacy: "プライバシーポリシー",
    searchPlaceholder: "シーンや単語を検索",
    emptyScenes: "利用できるシーンはまだありません。",
    noSearchResults: "一致する内容がありません。",
    audioUnavailable: "このブラウザでは音声を再生できません。音声ファイルを確認するか、Chrome/Safari をお試しください。",
    speechFailed: "音声を再生できません。もう一度お試しください。",
  },
};
const SCENE_COLOR_PALETTE = [
  "#FFE2A3",
  "#E3D2FF",
  "#FFC8B8",
  "#B8F0D4",
  "#C8F0B8",
  "#FFB8CF",
  "#B8E2FF",
  "#FFD06B",
  "#C8D8FF",
  "#FFB99A",
  "#D8C8A8",
  "#B8F0EE",
  "#F3C0FF",
  "#D6EE8F",
  "#FFB8B8",
  "#BEE4A8",
  "#B8C8FF",
  "#FFE6C8",
];
const SCENE_TILTS = [0, 0.4, -0.3, 0.2, -0.5, 0.3];

function getContentApiBase() {
  return (window.CONTENT_API_BASE || "").replace(/\/$/, "");
}

function normalizeRemoteAssetUrl(assetUrl, word) {
  if (assetUrl && typeof assetUrl === "object") {
    return normalizeRemoteAssetUrl(assetUrl.url || assetUrl.storageKey || "", word);
  }

  if (!assetUrl || /^https?:\/\//i.test(assetUrl) || assetUrl.startsWith("./") || assetUrl.startsWith("data:")) {
    return assetUrl;
  }

  if (assetUrl.startsWith("/uploads/")) {
    return `./assets/words/sticker/${slugify(word?.word || "")}.svg`;
  }

  return `${getContentApiBase()}${assetUrl.startsWith("/") ? "" : "/"}${assetUrl}`;
}

function normalizeRemoteImageUrl(imageUrl, word) {
  return normalizeRemoteAssetUrl(imageUrl, word);
}

function normalizeRemoteAudio(audio, word) {
  if (!audio || typeof audio !== "object") return audio || null;
  const normalized = {};
  for (const [key, value] of Object.entries(audio)) {
    if (value && typeof value === "object" && ("word" in value || "sentence" in value)) {
      normalized[key] = {
        ...value,
        word: normalizeRemoteAssetUrl(value.word, word),
        sentence: normalizeRemoteAssetUrl(value.sentence, word),
      };
    } else {
      normalized[key] = normalizeRemoteAssetUrl(value, word);
    }
  }
  if (audio.word) normalized.word = normalizeRemoteAssetUrl(audio.word, word);
  if (audio.sentence) normalized.sentence = normalizeRemoteAssetUrl(audio.sentence, word);
  return normalized;
}

function normalizeSceneImages(items) {
  return [...items].sort((a, b) => getSceneTime(b) - getSceneTime(a)).map((scene) => ({
    ...scene,
    icon: SCENE_ICON_BY_ID[scene.id] || scene.icon,
    words: (scene.words || []).map((word) => ({
      ...word,
      image: normalizeRemoteImageUrl(word.image, word),
      audio: normalizeRemoteAudio(word.audio, word),
    })),
  }));
}

function assignSceneColors(items) {
  return items.map((scene, index) => ({
    ...scene,
    colors: [
      SCENE_COLOR_PALETTE[index % SCENE_COLOR_PALETTE.length],
      SCENE_COLOR_PALETTE[(index + 5) % SCENE_COLOR_PALETTE.length],
    ],
  }));
}

function getSceneTime(scene) {
  return Date.parse(scene.publishedAt || scene.updatedAt || scene.createdAt || "") || 0;
}

function readCachedScenes() {
  try {
    const cached = JSON.parse(localStorage.getItem(sceneCacheKey) || "[]");
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
}

async function fetchPublishedScenesFromServer() {
  const remoteUrl = `${getContentApiBase()}/api/scenes/published`;
  const response = await fetch(remoteUrl);
  if (!response.ok) throw new Error(`Scene data request failed: ${response.status}`);
  const loadedScenes = assignSceneColors(normalizeSceneImages(await response.json()));
  if (!Array.isArray(loadedScenes) || loadedScenes.length === 0) {
    throw new Error("Scene data is empty");
  }
  localStorage.setItem(sceneCacheKey, JSON.stringify(loadedScenes));
  return loadedScenes;
}

async function loadPublishedScenes() {
  try {
    return await fetchPublishedScenesFromServer();
  } catch (error) {
    console.error(error);
    scheduleSceneRefreshRetries();
    const cachedScenes = readCachedScenes();
    if (cachedScenes.length > 0) return assignSceneColors(normalizeSceneImages(cachedScenes));
  }

  try {
    const response = await fetch("./data/scenes.published.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Bundled scene data request failed: ${response.status}`);
    return assignSceneColors(normalizeSceneImages(await response.json()));
  } catch (error) {
    console.error(error);
    return [];
  }
}

const homeView = document.querySelector("#homeView");
const sceneView = document.querySelector("#sceneView");
const searchView = document.querySelector("#searchView");
const sceneGrid = document.querySelector("#sceneGrid");
const searchGrid = document.querySelector("#searchGrid");
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
const searchButton = document.querySelector("#searchButton");
const closeSearch = document.querySelector("#closeSearch");
const searchInputWrap = document.querySelector("#searchInputWrap");
const sceneSearchInput = document.querySelector("#sceneSearchInput");
const clearSearchButton = document.querySelector("#clearSearchButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsSheet = document.querySelector("#settingsSheet");
const closeSettings = document.querySelector("#closeSettings");
const versionText = document.querySelector("#versionText");
const settingsTitle = document.querySelector("#settingsTitle");
const sourceLanguageLabel = document.querySelector("#sourceLanguageLabel");
const targetLanguageLabel = document.querySelector("#targetLanguageLabel");
const sourceLanguageChoices = document.querySelector("#sourceLanguageChoices");
const targetLanguageChoices = document.querySelector("#targetLanguageChoices");
const privacySummary = document.querySelector("#privacySummary");

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
let sceneSearchQuery = "";
let wordBackGesture = null;
let sceneBackGesture = null;
let sceneRefreshInFlight = null;
let sceneRetryTimers = [];
let languageSettings = readLanguageSettings();

function normalizeLanguage(language) {
  const value = String(language || "");
  if (value.startsWith("zh")) return "zh-CN";
  if (value.startsWith("ja")) return "ja-JP";
  if (value.startsWith("en")) return "en-US";
  return "";
}

function getDefaultSourceLanguage() {
  return normalizeLanguage(navigator.language) || "zh-CN";
}

function getDefaultTargetLanguage(sourceLanguage) {
  return sourceLanguage === "en-US" ? "zh-CN" : "en-US";
}

function readLanguageSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(languageSettingsKey) || "{}");
    const sourceLanguage = normalizeLanguage(saved.sourceLanguage) || getDefaultSourceLanguage();
    const targetLanguage = normalizeLanguage(saved.targetLanguage) || getDefaultTargetLanguage(sourceLanguage);
    return {
      sourceLanguage,
      targetLanguage: targetLanguage === sourceLanguage ? getDefaultTargetLanguage(sourceLanguage) : targetLanguage,
    };
  } catch {
    const sourceLanguage = getDefaultSourceLanguage();
    return { sourceLanguage, targetLanguage: getDefaultTargetLanguage(sourceLanguage) };
  }
}

function saveLanguageSettings() {
  localStorage.setItem(languageSettingsKey, JSON.stringify(languageSettings));
}

function t(key) {
  return UI_TEXT[languageSettings.sourceLanguage]?.[key] || UI_TEXT["en-US"][key] || key;
}

function getSceneText(scene, language) {
  return scene.i18n?.[language]?.title || (language === "zh-CN" ? scene.title : scene.subtitle) || scene.title || scene.subtitle || "";
}

function getWordContent(item, language) {
  const fallbackWord = language === "zh-CN" ? item.cn : item.word;
  const fallbackSentence = language === "en-US" ? item.sentence : "";
  return {
    word: item.i18n?.[language]?.word || fallbackWord || item.word || item.cn || "",
    sentence: item.i18n?.[language]?.sentence || fallbackSentence || item.sentence || "",
  };
}

function getTargetWord(item) {
  return getWordContent(item, languageSettings.targetLanguage);
}

function getSourceWord(item) {
  return getWordContent(item, languageSettings.sourceLanguage);
}

function getConceptSlug(item) {
  return slugify(item.word || item.i18n?.["en-US"]?.word || item.cn || "");
}

function clearSceneRefreshRetries() {
  sceneRetryTimers.forEach((timer) => clearTimeout(timer));
  sceneRetryTimers = [];
}

function scheduleSceneRefreshRetries() {
  if (sceneRetryTimers.length > 0) return;
  [800, 2500, 6000, 12000].forEach((delay) => {
    const timer = setTimeout(() => {
      sceneRetryTimers = sceneRetryTimers.filter((item) => item !== timer);
      refreshPublishedScenes();
    }, delay);
    sceneRetryTimers.push(timer);
  });
}

function syncCurrentSceneAfterRefresh() {
  if (currentScene) {
    currentScene = scenes.find((scene) => scene.id === currentScene.id) || scenes[0] || null;
  } else {
    currentScene = scenes[0] || null;
  }

  if (currentWord && currentScene) {
    currentWord = currentScene.words.find((item) => item.word === currentWord.word) || currentScene.words[0] || null;
  } else {
    currentWord = currentScene?.words?.[0] || null;
  }
}

function renderAfterSceneRefresh() {
  renderScenes();
  renderSearchResults();
  if (currentScene && !sceneView.classList.contains("is-hidden")) {
    renderWords(currentScene);
  }
  if (currentWord && !wordSheet.classList.contains("is-hidden")) {
    renderWordSheetContent(currentWord, currentScene);
  }
}

async function refreshPublishedScenes() {
  if (sceneRefreshInFlight) return sceneRefreshInFlight;

  sceneRefreshInFlight = fetchPublishedScenesFromServer()
    .then((loadedScenes) => {
      scenes = loadedScenes;
      syncCurrentSceneAfterRefresh();
      renderAfterSceneRefresh();
      clearSceneRefreshRetries();
      return loadedScenes;
    })
    .catch((error) => {
      console.error(error);
      return null;
    })
    .finally(() => {
      sceneRefreshInFlight = null;
    });

  return sceneRefreshInFlight;
}

function renderScenes() {
  if (scenes.length === 0) {
    sceneGrid.innerHTML = `<p class="empty-state">${t("emptyScenes")}</p>`;
    return;
  }

  sceneGrid.innerHTML = scenes
    .map(
      (scene, index) => {
        const sourceTitle = getSceneText(scene, languageSettings.sourceLanguage);
        const targetTitle = getSceneText(scene, languageSettings.targetLanguage);
        return `
        <button class="scene-card" type="button" data-scene="${scene.id}" style="--accent-a: ${scene.colors[0]}; --accent-b: ${scene.colors[1]}; --tilt: ${SCENE_TILTS[index % SCENE_TILTS.length]}deg">
          <span class="scene-art" aria-hidden="true">${scene.icon}</span>
          <span>
            <h3>${sourceTitle}</h3>
            <p>${targetTitle}<span class="word-count-badge">${scene.words.length} words</span></p>
          </span>
          <span class="scene-arrow" aria-hidden="true">›</span>
        </button>
      `;
      }
    )
    .join("");
}

function renderSceneCards(target, items) {
  if (items.length === 0) {
    target.innerHTML = `<p class="empty-state">${t("noSearchResults")}</p>`;
    return;
  }

  target.innerHTML = items
    .map(
      (scene, index) => {
        const sourceTitle = getSceneText(scene, languageSettings.sourceLanguage);
        const targetTitle = getSceneText(scene, languageSettings.targetLanguage);
        return `
        <button class="scene-card" type="button" data-scene="${scene.id}" style="--accent-a: ${scene.colors[0]}; --accent-b: ${scene.colors[1]}; --tilt: ${SCENE_TILTS[index % SCENE_TILTS.length]}deg">
          <span class="scene-art" aria-hidden="true">${scene.icon}</span>
          <span>
            <h3>${sourceTitle}</h3>
            <p>${targetTitle}<span class="word-count-badge">${scene.words.length} words</span></p>
          </span>
          <span class="scene-arrow" aria-hidden="true">›</span>
        </button>
      `;
      }
    )
    .join("");
}

function getSearchMatches(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return scenes;

  return scenes.filter((scene) => {
    const sceneText = [
      scene.title,
      scene.subtitle,
      ...SUPPORTED_LANGUAGES.map((language) => getSceneText(scene, language.code)),
    ].join(" ").toLowerCase();
    const wordsText = (scene.words || [])
      .map((word) => [
        word.word,
        word.cn,
        word.sentence,
        ...SUPPORTED_LANGUAGES.flatMap((language) => {
          const content = getWordContent(word, language.code);
          return [content.word, content.sentence];
        }),
      ].join(" "))
      .join(" ")
      .toLowerCase();
    return sceneText.includes(normalizedQuery) || wordsText.includes(normalizedQuery);
  });
}

function renderSearchResults() {
  searchInputWrap.classList.toggle("has-query", sceneSearchQuery.trim().length > 0);

  if (!sceneSearchQuery.trim()) {
    searchGrid.innerHTML = "";
    return;
  }

  renderSceneCards(searchGrid, getSearchMatches(sceneSearchQuery));
}

function openSearchView() {
  sceneSearchInput.value = "";
  sceneSearchQuery = "";
  renderSearchResults();
  searchView.classList.remove("is-hidden");
  window.setTimeout(() => sceneSearchInput.focus(), 40);
}

function closeSearchView() {
  sceneSearchQuery = "";
  sceneSearchInput.value = "";
  searchView.classList.add("is-hidden");
}

function clearSearch() {
  sceneSearchInput.value = "";
  sceneSearchQuery = "";
  renderSearchResults();
  sceneSearchInput.focus();
}

function renderLanguageChoices(container, field, selectedValue) {
  container.innerHTML = SUPPORTED_LANGUAGES
    .map((language) => {
      const isSelected = language.code === selectedValue;
      return `
        <button
          class="language-choice ${isSelected ? "is-selected" : ""}"
          type="button"
          role="radio"
          aria-checked="${isSelected ? "true" : "false"}"
          data-language-field="${field}"
          data-language-code="${language.code}"
        >
          <span>${language.label}</span>
        </button>
      `;
    })
    .join("");
}

function applyUiText() {
  settingsTitle.textContent = t("settings");
  sourceLanguageLabel.textContent = t("sourceLanguage");
  targetLanguageLabel.textContent = t("targetLanguage");
  privacySummary.textContent = t("privacy");
  sceneSearchInput.placeholder = t("searchPlaceholder");
  document.querySelector(".settings-row span").textContent = t("version");
}

function renderLanguageSettings() {
  applyUiText();
  renderLanguageChoices(sourceLanguageChoices, "sourceLanguage", languageSettings.sourceLanguage);
  renderLanguageChoices(targetLanguageChoices, "targetLanguage", languageSettings.targetLanguage);
}

function updateLanguageSettings(field, value) {
  const normalized = normalizeLanguage(value);
  if (!normalized) return;
  languageSettings = {
    ...languageSettings,
    [field]: normalized,
  };
  if (languageSettings.sourceLanguage === languageSettings.targetLanguage) {
    languageSettings.targetLanguage = getDefaultTargetLanguage(languageSettings.sourceLanguage);
  }
  saveLanguageSettings();
  applyUiText();
  renderLanguageSettings();
  renderScenes();
  renderSearchResults();
  if (currentScene && !sceneView.classList.contains("is-hidden")) {
    renderWords(currentScene);
  }
  if (currentWord && !wordSheet.classList.contains("is-hidden")) {
    renderWordSheetContent(currentWord, currentScene);
  }
}

function openSettings() {
  versionText.textContent = APP_VERSION;
  renderLanguageSettings();
  settingsSheet.classList.remove("is-hidden");
  scrim.classList.remove("is-hidden");
}

function closeSettingsSheet() {
  settingsSheet.classList.add("is-hidden");
  if (wordSheet.classList.contains("is-hidden")) {
    scrim.classList.add("is-hidden");
  }
}

function renderPicture(item) {
  if (item.image) {
    return `<img src="${item.image}" alt="" />`;
  }

  return item.picture;
}

function renderWords(scene) {
  sceneTitle.textContent = getSceneText(scene, languageSettings.sourceLanguage);
  sceneSubtitle.textContent = getSceneText(scene, languageSettings.targetLanguage);
  wordGrid.innerHTML = scene.words
    .map((item, index) => {
      const target = getTargetWord(item);
      const source = getSourceWord(item);
      return `
        <button class="word-card" type="button" data-word="${index}" style="--accent-a: ${scene.colors[0]}; --accent-b: ${scene.colors[1]}">
          <span class="picture-frame" aria-hidden="true">${renderPicture(item)}</span>
          <strong>${target.word}</strong>
          <span>${source.word}</span>
        </button>
      `;
    })
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

function getPreferredVoice(language) {
  const preferred = voices.find((voice) => voice.lang === language && /female|samantha|victoria|ava|kyoko|tingting|mei/i.test(voice.name));
  return preferred || voices.find((voice) => voice.lang === language) || voices.find((voice) => voice.lang.startsWith(language.split("-")[0])) || null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getAudioUrl(kind, item) {
  if (!kind) return "";
  const languageAudio = item?.audio?.[languageSettings.targetLanguage];
  const remoteUrl = kind === "words" ? languageAudio?.word || item?.audio?.word : languageAudio?.sentence || item?.audio?.sentence;
  if (remoteUrl) return remoteUrl;
  const concept = getConceptSlug(item);
  if (!concept) return "";
  return `./audio/${languageSettings.targetLanguage}/${kind}/${concept}.mp3`;
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

function playLocalAudio(text, target, kind, item) {
  const audioUrl = getAudioUrl(kind, item);
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

async function speak(text, target, kind, item, retried = false) {
  document.querySelectorAll(".is-speaking").forEach((item) => item.classList.remove("is-speaking"));

  try {
    await playLocalAudio(text, target, kind, item);
    return;
  } catch {
    activeAudio = null;
  }

  if (!canUseSpeech()) {
    showAudioMessage(t("audioUnavailable"));
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
  utterance.lang = languageSettings.targetLanguage;
  utterance.rate = text.split(" ").length > 2 ? 0.78 : 0.82;
  utterance.pitch = 1.08;

  const voice = getPreferredVoice(languageSettings.targetLanguage);
  if (voice) utterance.voice = voice;

  if (target) target.classList.add("is-speaking");
  activeUtterance = utterance;

  return new Promise((resolve) => {
    let speechStarted = false;
    let fallbackTimer = null;

    utterance.onend = () => {
      window.clearTimeout(fallbackTimer);
      target?.classList.remove("is-speaking");
      resolve();
    };
    utterance.onstart = () => {
      speechStarted = true;
      window.clearTimeout(fallbackTimer);
    };
    utterance.onerror = () => {
      window.clearTimeout(fallbackTimer);
      target?.classList.remove("is-speaking");
      if (!retried && !speechStarted) {
        window.setTimeout(() => {
          speak(text, target, kind, item, true).finally(resolve);
        }, 300);
        return;
      }
      showAudioMessage(t("speechFailed"));
      resolve();
    };

    window.speechSynthesis.speak(utterance);

    // WKWebView can take noticeably longer than Safari to update speaking/pending.
    // Retrying after 280ms cancels speech that is about to start.
    fallbackTimer = window.setTimeout(() => {
      const synth = window.speechSynthesis;
      if (!retried && !speechStarted && !synth.speaking && !synth.pending) {
        speak(text, target, kind, item, true).finally(resolve);
      }
    }, 1500);
  });
}

function renderWordSheetContent(item, scene) {
  const target = getTargetWord(item);
  sheetPicture.innerHTML = renderPicture(item);
  sheetPicture.style.setProperty("--accent-a", scene.colors[0]);
  sheetPicture.style.setProperty("--accent-b", scene.colors[1]);
  sheetWord.textContent = target.word;
  wordSoundText.textContent = target.word;
  sheetSentence.textContent = target.sentence;
}

function openWordSheet(item, scene, options = {}) {
  if (!item || !scene) return;
  currentWord = item;

  const target = getTargetWord(item);
  renderWordSheetContent(item, scene);
  wordSheet.classList.remove("is-hidden");
  scrim.classList.remove("is-hidden");
  if (!options.skipHistory) {
    history.pushState(
      { view: "word", sceneId: scene.id, word: item.word },
      "",
      `#${scene.id}/${slugify(item.word)}`
    );
  }
  speak(target.word, wordSoundButton, "words", item);
}

function closeWordSheet(options = {}) {
  wordSheet.classList.add("is-hidden");
  if (settingsSheet.classList.contains("is-hidden")) {
    scrim.classList.add("is-hidden");
  }
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

function handleWordGestureStart(event) {
  if (wordSheet.classList.contains("is-hidden") || event.touches.length !== 1) return;
  const touch = event.touches[0];
  const target = event.target;
  const startedOnWordLayer = wordSheet.contains(target) || scrim.contains(target);
  if (!startedOnWordLayer && touch.clientX > 120) return;
  wordBackGesture = {
    startX: touch.clientX,
    startY: touch.clientY,
    startedAt: Date.now(),
  };
}

function handleWordGestureEnd(event) {
  if (!wordBackGesture || wordSheet.classList.contains("is-hidden")) {
    wordBackGesture = null;
    return;
  }

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - wordBackGesture.startX;
  const deltaY = touch.clientY - wordBackGesture.startY;
  const elapsed = Date.now() - wordBackGesture.startedAt;
  wordBackGesture = null;

  if (deltaX > 58 && Math.abs(deltaY) < 72 && deltaX > Math.abs(deltaY) * 1.4 && elapsed < 900) {
    closeWordSheet();
  }
}

function handleSceneGestureStart(event) {
  if (sceneView.classList.contains("is-hidden") || !wordSheet.classList.contains("is-hidden") || event.touches.length !== 1) return;
  const touch = event.touches[0];
  if (touch.clientX > 96) return;
  sceneBackGesture = {
    startX: touch.clientX,
    startY: touch.clientY,
    startedAt: Date.now(),
  };
}

function handleSceneGestureEnd(event) {
  if (!sceneBackGesture || sceneView.classList.contains("is-hidden") || !wordSheet.classList.contains("is-hidden")) {
    sceneBackGesture = null;
    return;
  }

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - sceneBackGesture.startX;
  const deltaY = touch.clientY - sceneBackGesture.startY;
  const elapsed = Date.now() - sceneBackGesture.startedAt;
  sceneBackGesture = null;

  if (deltaX > 64 && Math.abs(deltaY) < 72 && deltaX > Math.abs(deltaY) * 1.35 && elapsed < 900) {
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
  if (!searchView.classList.contains("is-hidden")) {
    closeSearchView();
    return true;
  }

  if (!settingsSheet.classList.contains("is-hidden")) {
    closeSettingsSheet();
    return true;
  }

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
  versionText.textContent = APP_VERSION;

  renderLanguageSettings();
  renderScenes();
  loadVoices();
  history.replaceState({ view: "home" }, "", location.pathname);
  if (canUseSpeech() && typeof window.speechSynthesis.addEventListener === "function") {
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
  } else if (canUseSpeech()) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  document.addEventListener("pointerdown", primeSpeech, { once: true });
  document.addEventListener("touchstart", handleWordGestureStart, { passive: true });
  document.addEventListener("touchend", handleWordGestureEnd, { passive: true });
  document.addEventListener("touchstart", handleSceneGestureStart, { passive: true });
  document.addEventListener("touchend", handleSceneGestureEnd, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshPublishedScenes();
  });
  window.addEventListener("focus", refreshPublishedScenes);
  window.addEventListener("online", refreshPublishedScenes);
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
scrim.addEventListener("click", () => {
  if (!settingsSheet.classList.contains("is-hidden")) {
    closeSettingsSheet();
    return;
  }
  closeWordSheet();
});
wordSoundButton.addEventListener("click", () => currentWord && speak(getTargetWord(currentWord).word, wordSoundButton, "words", currentWord));
sentenceSoundButton.addEventListener("click", () => currentWord && speak(getTargetWord(currentWord).sentence, sentenceSoundButton, "sentences", currentWord));
searchButton.addEventListener("click", openSearchView);
sceneSearchInput.addEventListener("input", () => {
  sceneSearchQuery = sceneSearchInput.value;
  renderSearchResults();
});
clearSearchButton.addEventListener("click", clearSearch);
closeSearch.addEventListener("click", closeSearchView);
searchGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-scene]");
  if (!card) return;
  closeSearchView();
  showScene(card.dataset.scene);
});
settingsButton.addEventListener("click", openSettings);
closeSettings.addEventListener("click", closeSettingsSheet);
settingsSheet.addEventListener("click", (event) => {
  const choice = event.target.closest("[data-language-field][data-language-code]");
  if (!choice) return;
  updateLanguageSettings(choice.dataset.languageField, choice.dataset.languageCode);
});

initApp();
