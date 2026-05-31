const scenes = [
  {
    id: "living-room",
    title: "客厅",
    subtitle: "Living Room",
    icon: "🛋️",
    colors: ["#ffe3a3", "#bfe7ff"],
    words: [
      { word: "sofa", cn: "沙发", picture: "🛋️", sentence: "I sit on the sofa." },
      { word: "TV", cn: "电视", picture: "📺", sentence: "The TV is on." },
      { word: "table", cn: "桌子", picture: "🪵", sentence: "This is a table." },
      { word: "chair", cn: "椅子", picture: "🪑", sentence: "I sit on a chair." },
      { word: "lamp", cn: "台灯", picture: "💡", sentence: "The lamp is on." },
      { word: "book", cn: "书", picture: "📘", sentence: "I read a book." },
      { word: "toy", cn: "玩具", picture: "🧸", sentence: "This is my toy." },
      { word: "ball", cn: "球", picture: "⚽", sentence: "I kick the ball." },
      { word: "box", cn: "盒子", picture: "📦", sentence: "The toy is in the box." },
      { word: "clock", cn: "钟", picture: "🕒", sentence: "This is a clock." },
      { word: "window", cn: "窗户", picture: "🪟", sentence: "Open the window." },
      { word: "door", cn: "门", picture: "🚪", sentence: "Close the door." },
    ],
  },
  {
    id: "bedroom",
    title: "卧室",
    subtitle: "Bedroom",
    icon: "🛏️",
    colors: ["#e6d7ff", "#c8f0ff"],
    words: [
      { word: "bed", cn: "床", picture: "🛏️", sentence: "This is my bed." },
      { word: "pillow", cn: "枕头", picture: "🛏️", sentence: "My pillow is soft." },
      { word: "blanket", cn: "毯子", picture: "🧺", sentence: "I have a blanket." },
      { word: "teddy bear", cn: "玩具熊", picture: "🧸", sentence: "I hug my teddy bear." },
      { word: "pajamas", cn: "睡衣", picture: "👕", sentence: "I wear pajamas." },
      { word: "shoes", cn: "鞋子", picture: "👟", sentence: "Put on your shoes." },
      { word: "socks", cn: "袜子", picture: "🧦", sentence: "These are my socks." },
      { word: "shirt", cn: "衬衫", picture: "👕", sentence: "This is my shirt." },
      { word: "pants", cn: "裤子", picture: "👖", sentence: "These are my pants." },
      { word: "mirror", cn: "镜子", picture: "🪞", sentence: "I see me in the mirror." },
      { word: "bag", cn: "包", picture: "🎒", sentence: "My bag is here." },
      { word: "sleep", cn: "睡觉", picture: "😴", sentence: "I sleep at night." },
    ],
  },
  {
    id: "kitchen",
    title: "厨房",
    subtitle: "Kitchen",
    icon: "🍽️",
    colors: ["#ffd2c2", "#fff0a8"],
    words: [
      { word: "apple", cn: "苹果", picture: "🍎", sentence: "This is an apple." },
      { word: "banana", cn: "香蕉", picture: "🍌", sentence: "I like bananas." },
      { word: "orange", cn: "橙子", picture: "🍊", sentence: "This is an orange." },
      { word: "bread", cn: "面包", picture: "🍞", sentence: "I eat bread." },
      { word: "milk", cn: "牛奶", picture: "🥛", sentence: "I drink milk." },
      { word: "water", cn: "水", picture: "💧", sentence: "I drink water." },
      { word: "egg", cn: "鸡蛋", picture: "🥚", sentence: "This is an egg." },
      { word: "cup", cn: "杯子", picture: "☕", sentence: "This is a cup." },
      { word: "bowl", cn: "碗", picture: "🥣", sentence: "This is a bowl." },
      { word: "plate", cn: "盘子", picture: "🍽️", sentence: "This is a plate." },
      { word: "spoon", cn: "勺子", picture: "🥄", sentence: "I use a spoon." },
      { word: "fork", cn: "叉子", picture: "🍴", sentence: "I use a fork." },
      { word: "rice", cn: "米饭", picture: "🍚", sentence: "I eat rice." },
      { word: "soup", cn: "汤", picture: "🍲", sentence: "The soup is hot." },
    ],
  },
  {
    id: "kindergarten",
    title: "幼儿园",
    subtitle: "Kindergarten",
    icon: "🎒",
    colors: ["#bff0d8", "#fff0a8"],
    words: [
      { word: "teacher", cn: "老师", picture: "👩‍🏫", sentence: "This is my teacher." },
      { word: "friend", cn: "朋友", picture: "🧒", sentence: "This is my friend." },
      { word: "bag", cn: "书包", picture: "🎒", sentence: "My bag is red." },
      { word: "book", cn: "书", picture: "📘", sentence: "Open your book." },
      { word: "pencil", cn: "铅笔", picture: "✏️", sentence: "I have a pencil." },
      { word: "crayon", cn: "蜡笔", picture: "🖍️", sentence: "I color with a crayon." },
      { word: "paper", cn: "纸", picture: "📄", sentence: "Draw on the paper." },
      { word: "desk", cn: "课桌", picture: "🪵", sentence: "This is my desk." },
      { word: "chair", cn: "椅子", picture: "🪑", sentence: "Sit on the chair." },
      { word: "blocks", cn: "积木", picture: "🧱", sentence: "I play with blocks." },
      { word: "music", cn: "音乐", picture: "🎵", sentence: "I like music." },
      { word: "nap", cn: "午睡", picture: "😴", sentence: "It is nap time." },
    ],
  },
  {
    id: "zoo",
    title: "动物园",
    subtitle: "Zoo",
    icon: "🦁",
    colors: ["#c8efb5", "#bfe4ff"],
    words: [
      { word: "lion", cn: "狮子", picture: "🦁", sentence: "I see a lion." },
      { word: "tiger", cn: "老虎", picture: "🐯", sentence: "I see a tiger." },
      { word: "monkey", cn: "猴子", picture: "🐵", sentence: "The monkey is funny." },
      { word: "panda", cn: "熊猫", picture: "🐼", sentence: "I see a panda." },
      { word: "elephant", cn: "大象", picture: "🐘", sentence: "The elephant is big." },
      { word: "giraffe", cn: "长颈鹿", picture: "🦒", sentence: "The giraffe is tall." },
      { word: "zebra", cn: "斑马", picture: "🦓", sentence: "The zebra has stripes." },
      { word: "bear", cn: "熊", picture: "🐻", sentence: "The bear is big." },
      { word: "rabbit", cn: "兔子", picture: "🐰", sentence: "The rabbit can hop." },
      { word: "bird", cn: "鸟", picture: "🐦", sentence: "The bird can fly." },
      { word: "duck", cn: "鸭子", picture: "🦆", sentence: "The duck can swim." },
      { word: "fish", cn: "鱼", picture: "🐟", sentence: "The fish is small." },
      { word: "snake", cn: "蛇", picture: "🐍", sentence: "The snake is long." },
    ],
  },
  {
    id: "playground",
    title: "游乐场",
    subtitle: "Playground",
    icon: "🎠",
    colors: ["#ffc2d1", "#bde0fe"],
    words: [
      { word: "slide", cn: "滑梯", picture: "🛝", sentence: "I go down the slide." },
      { word: "swing", cn: "秋千", picture: "🌈", sentence: "I play on the swing." },
      { word: "seesaw", cn: "跷跷板", picture: "⚖️", sentence: "I ride the seesaw." },
      { word: "sand", cn: "沙子", picture: "🏖️", sentence: "I play with sand." },
      { word: "bucket", cn: "桶", picture: "🪣", sentence: "This is a bucket." },
      { word: "shovel", cn: "铲子", picture: "🥄", sentence: "I dig with a shovel." },
      { word: "ball", cn: "球", picture: "⚽", sentence: "Throw the ball." },
      { word: "kite", cn: "风筝", picture: "🪁", sentence: "The kite is up." },
      { word: "bike", cn: "自行车", picture: "🚲", sentence: "I ride a bike." },
      { word: "car", cn: "小车", picture: "🚗", sentence: "The car goes fast." },
      { word: "train", cn: "小火车", picture: "🚂", sentence: "The train goes choo choo." },
      { word: "ticket", cn: "票", picture: "🎟️", sentence: "I have a ticket." },
    ],
  },
  {
    id: "subway-station",
    title: "地铁站",
    subtitle: "Subway Station",
    icon: "🚇",
    colors: ["#c8f7dc", "#cdd7ff"],
    words: [
      { word: "subway", cn: "地铁", picture: "🚇", sentence: "I take the subway." },
      { word: "train", cn: "列车", picture: "🚆", sentence: "The train is here." },
      { word: "station", cn: "车站", picture: "🚉", sentence: "This is the station." },
      { word: "ticket", cn: "车票", picture: "🎫", sentence: "I have a ticket." },
      { word: "gate", cn: "闸机", picture: "🚧", sentence: "Go through the gate." },
      { word: "map", cn: "地图", picture: "🗺️", sentence: "Look at the map." },
      { word: "stairs", cn: "楼梯", picture: "🪜", sentence: "Go up the stairs." },
      { word: "elevator", cn: "电梯", picture: "🛗", sentence: "Take the elevator." },
      { word: "seat", cn: "座位", picture: "💺", sentence: "This is my seat." },
      { word: "door", cn: "门", picture: "🚪", sentence: "The door is open." },
      { word: "line", cn: "排队", picture: "🚶", sentence: "Stand in line." },
      { word: "exit", cn: "出口", picture: "🚪", sentence: "This is the exit." },
    ],
  },
  {
    id: "bus",
    title: "公交",
    subtitle: "Bus",
    icon: "🚌",
    colors: ["#ffd166", "#a8dadc"],
    words: [
      { word: "bus", cn: "公交车", picture: "🚌", sentence: "I take the bus." },
      { word: "bus stop", cn: "公交站", picture: "🚏", sentence: "This is the bus stop." },
      { word: "driver", cn: "司机", picture: "🧑‍✈️", sentence: "The driver is kind." },
      { word: "seat", cn: "座位", picture: "💺", sentence: "Sit on the seat." },
      { word: "door", cn: "车门", picture: "🚪", sentence: "The door is open." },
      { word: "window", cn: "窗户", picture: "🪟", sentence: "Look out the window." },
      { word: "card", cn: "卡", picture: "💳", sentence: "Tap the card." },
      { word: "ticket", cn: "车票", picture: "🎫", sentence: "Here is my ticket." },
      { word: "bell", cn: "铃", picture: "🔔", sentence: "Ring the bell." },
      { word: "wheel", cn: "轮子", picture: "🛞", sentence: "The wheel goes round." },
      { word: "stop", cn: "停", picture: "🛑", sentence: "The bus will stop." },
      { word: "road", cn: "路", picture: "🛣️", sentence: "The bus is on the road." },
    ],
  },
  {
    id: "bathroom",
    title: "卫生间",
    subtitle: "Bathroom",
    icon: "🧼",
    colors: ["#bde0fe", "#d9f99d"],
    words: [
      { word: "toilet", cn: "马桶", picture: "🚽", sentence: "This is a toilet." },
      { word: "sink", cn: "洗手池", picture: "🚰", sentence: "Wash at the sink." },
      { word: "soap", cn: "香皂", picture: "🧼", sentence: "Use the soap." },
      { word: "towel", cn: "毛巾", picture: "🧻", sentence: "Dry with a towel." },
      { word: "water", cn: "水", picture: "💧", sentence: "The water is warm." },
      { word: "bath", cn: "洗澡", picture: "🛁", sentence: "I take a bath." },
      { word: "shower", cn: "淋浴", picture: "🚿", sentence: "Take a shower." },
      { word: "toothbrush", cn: "牙刷", picture: "🪥", sentence: "Use a toothbrush." },
      { word: "toothpaste", cn: "牙膏", picture: "🦷", sentence: "Put on toothpaste." },
      { word: "comb", cn: "梳子", picture: "💇", sentence: "I use a comb." },
      { word: "mirror", cn: "镜子", picture: "🪞", sentence: "Look in the mirror." },
      { word: "clean", cn: "干净", picture: "✨", sentence: "My hands are clean." },
    ],
  },
  {
    id: "vehicles",
    title: "交通工具",
    subtitle: "Vehicles",
    icon: "🚗",
    colors: ["#fbc4ab", "#a3cef1"],
    words: [
      { word: "car", cn: "汽车", picture: "🚗", sentence: "The car is fast." },
      { word: "bus", cn: "公交车", picture: "🚌", sentence: "The bus is big." },
      { word: "taxi", cn: "出租车", picture: "🚕", sentence: "This is a taxi." },
      { word: "bike", cn: "自行车", picture: "🚲", sentence: "I ride a bike." },
      { word: "scooter", cn: "滑板车", picture: "🛴", sentence: "I ride a scooter." },
      { word: "train", cn: "火车", picture: "🚆", sentence: "The train is long." },
      { word: "subway", cn: "地铁", picture: "🚇", sentence: "The subway is here." },
      { word: "plane", cn: "飞机", picture: "✈️", sentence: "The plane is high." },
      { word: "boat", cn: "船", picture: "⛵", sentence: "The boat is on water." },
      { word: "ship", cn: "轮船", picture: "🚢", sentence: "The ship is big." },
      { word: "truck", cn: "卡车", picture: "🚚", sentence: "The truck is heavy." },
      { word: "fire truck", cn: "消防车", picture: "🚒", sentence: "The fire truck is red." },
      { word: "ambulance", cn: "救护车", picture: "🚑", sentence: "The ambulance is loud." },
      { word: "rocket", cn: "火箭", picture: "🚀", sentence: "The rocket goes up." },
    ],
  },
  {
    id: "park",
    title: "公园",
    subtitle: "Park",
    icon: "🌳",
    colors: ["#c8efb5", "#fdf0a5"],
    words: [
      { word: "tree", cn: "树", picture: "🌳", sentence: "This is a tree." },
      { word: "flower", cn: "花", picture: "🌸", sentence: "The flower is pretty." },
      { word: "grass", cn: "草地", picture: "🌱", sentence: "The grass is green." },
      { word: "leaf", cn: "叶子", picture: "🍃", sentence: "This is a leaf." },
      { word: "bird", cn: "鸟", picture: "🐦", sentence: "I see a bird." },
      { word: "dog", cn: "狗", picture: "🐶", sentence: "The dog can run." },
      { word: "cat", cn: "猫", picture: "🐱", sentence: "The cat is cute." },
      { word: "bench", cn: "长椅", picture: "🪑", sentence: "Sit on the bench." },
      { word: "lake", cn: "湖", picture: "🏞️", sentence: "The lake is blue." },
      { word: "bridge", cn: "桥", picture: "🌉", sentence: "Walk on the bridge." },
      { word: "sun", cn: "太阳", picture: "☀️", sentence: "The sun is warm." },
      { word: "cloud", cn: "云", picture: "☁️", sentence: "I see a cloud." },
      { word: "rain", cn: "雨", picture: "🌧️", sentence: "The rain is falling." },
      { word: "picnic", cn: "野餐", picture: "🧺", sentence: "We have a picnic." },
    ],
  },
  {
    id: "signs",
    title: "指示牌",
    subtitle: "Signs",
    icon: "🚦",
    colors: ["#d0f4de", "#ffd6a5"],
    words: [
      { word: "stop", cn: "停止", picture: "🛑", sentence: "Stop here, please." },
      { word: "go", cn: "通行", picture: "🟢", sentence: "Go now, please." },
      { word: "exit", cn: "出口", picture: "🚪", sentence: "This is the exit." },
      { word: "entrance", cn: "入口", picture: "➡️", sentence: "This is the entrance." },
      { word: "toilet", cn: "卫生间", picture: "🚻", sentence: "Where is the toilet?" },
      { word: "stairs", cn: "楼梯", picture: "🪜", sentence: "Use the stairs." },
      { word: "elevator", cn: "电梯", picture: "🛗", sentence: "Take the elevator." },
      { word: "left", cn: "左边", picture: "⬅️", sentence: "Turn left." },
      { word: "right", cn: "右边", picture: "➡️", sentence: "Turn right." },
      { word: "up", cn: "向上", picture: "⬆️", sentence: "Go up." },
      { word: "down", cn: "向下", picture: "⬇️", sentence: "Go down." },
      { word: "push", cn: "推", picture: "👉", sentence: "Push the door." },
      { word: "pull", cn: "拉", picture: "👈", sentence: "Pull the door." },
      { word: "no", cn: "不可以", picture: "🚫", sentence: "No running here." },
    ],
  },
];

const homeView = document.querySelector("#homeView");
const sceneView = document.querySelector("#sceneView");
const sceneGrid = document.querySelector("#sceneGrid");
const wordGrid = document.querySelector("#wordGrid");
const backButton = document.querySelector("#backButton");
const voiceButton = document.querySelector("#voiceButton");
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

let currentScene = scenes[0];
let currentWord = scenes[0].words[0];
let voices = [];
let activeUtterance = null;
let audioToastTimer = null;

function renderScenes() {
  sceneGrid.innerHTML = scenes
    .map(
      (scene) => `
        <button class="scene-card" type="button" data-scene="${scene.id}" style="--accent-a: ${scene.colors[0]}; --accent-b: ${scene.colors[1]}">
          <span class="scene-art" aria-hidden="true">${scene.icon}</span>
          <span>
            <h3>${scene.title}</h3>
            <p>${scene.subtitle} · ${scene.words.length} words</p>
          </span>
          <span class="scene-arrow" aria-hidden="true">›</span>
        </button>
      `
    )
    .join("");
}

function renderWords(scene) {
  sceneTitle.textContent = scene.title;
  sceneSubtitle.textContent = scene.subtitle;
  wordGrid.innerHTML = scene.words
    .map(
      (item, index) => `
        <button class="word-card" type="button" data-word="${index}" style="--accent-a: ${scene.colors[0]}; --accent-b: ${scene.colors[1]}">
          <span class="picture-frame" aria-hidden="true">${item.picture}</span>
          <strong>${item.word}</strong>
          <span>${item.cn}</span>
        </button>
      `
    )
    .join("");
}

function showScene(sceneId) {
  currentScene = scenes.find((scene) => scene.id === sceneId) || scenes[0];
  renderWords(currentScene);
  homeView.classList.add("is-hidden");
  sceneView.classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHome() {
  closeWordSheet();
  sceneView.classList.add("is-hidden");
  homeView.classList.remove("is-hidden");
}

function getEnglishVoice() {
  const preferred = voices.find((voice) => voice.lang === "en-US" && /female|samantha|victoria|ava/i.test(voice.name));
  return preferred || voices.find((voice) => voice.lang === "en-US") || voices.find((voice) => voice.lang.startsWith("en")) || null;
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

async function speak(text, target, retried = false) {
  if (!canUseSpeech()) {
    showAudioMessage("这个浏览器不支持直接朗读，可以换 Chrome 或 Safari 试试。");
    return;
  }

  await waitForVoices();

  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();
  document.querySelectorAll(".is-speaking").forEach((item) => item.classList.remove("is-speaking"));

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = text.split(" ").length > 2 ? 0.78 : 0.82;
  utterance.pitch = 1.08;

  const voice = getEnglishVoice();
  if (voice) utterance.voice = voice;

  if (target) target.classList.add("is-speaking");
  utterance.onend = () => target?.classList.remove("is-speaking");
  utterance.onerror = () => {
    target?.classList.remove("is-speaking");
    if (!retried) {
      window.setTimeout(() => speak(text, target, true), 180);
      return;
    }
    showAudioMessage("朗读没有启动。Android 上建议用 Chrome，并确认系统文字转语音已开启。");
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);

  window.setTimeout(() => {
    const synth = window.speechSynthesis;
    if (!retried && !synth.speaking && !synth.pending) {
      speak(text, target, true);
    }
  }, 280);
}

function openWordSheet(item, scene) {
  currentWord = item;
  sheetPicture.textContent = item.picture;
  sheetPicture.style.setProperty("--accent-a", scene.colors[0]);
  sheetPicture.style.setProperty("--accent-b", scene.colors[1]);
  sheetWord.textContent = item.word;
  wordSoundText.textContent = item.word;
  sheetSentence.textContent = item.sentence;
  wordSheet.classList.remove("is-hidden");
  scrim.classList.remove("is-hidden");
  speak(item.word, wordSoundButton);
}

function closeWordSheet() {
  wordSheet.classList.add("is-hidden");
  scrim.classList.add("is-hidden");
  window.speechSynthesis?.cancel();
  activeUtterance = null;
  document.querySelectorAll(".is-speaking").forEach((item) => item.classList.remove("is-speaking"));
}

function loadVoices() {
  refreshVoices();
}

function primeSpeech() {
  if (!canUseSpeech()) return;
  refreshVoices();
  window.speechSynthesis.resume();
}

renderScenes();
loadVoices();
if (canUseSpeech() && typeof window.speechSynthesis.addEventListener === "function") {
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
} else if (canUseSpeech()) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

document.addEventListener("pointerdown", primeSpeech, { once: true });

sceneGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-scene]");
  if (!card) return;
  showScene(card.dataset.scene);
});

wordGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-word]");
  if (!card) return;
  const item = currentScene.words[Number(card.dataset.word)];
  openWordSheet(item, currentScene);
});

backButton.addEventListener("click", showHome);
voiceButton.addEventListener("click", () => speak("Hello! Let's learn English.", voiceButton));
closeSheet.addEventListener("click", closeWordSheet);
scrim.addEventListener("click", closeWordSheet);
wordSoundButton.addEventListener("click", () => speak(currentWord.word, wordSoundButton));
sentenceSoundButton.addEventListener("click", () => speak(currentWord.sentence, sentenceSoundButton));
