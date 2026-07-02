const { execFile } = require("node:child_process");
const { mkdir, readFile, stat, writeFile } = require("node:fs/promises");
const { join } = require("node:path");

const rootDir = join(__dirname, "..");
const publishedScenesFile = join(rootDir, "data", "scenes.published.json");
const audioDir = join(rootDir, "audio");
const pythonPackagesDir = join(rootDir, ".python-packages");
const apiBase = (process.env.CONTENT_API_BASE || "").replace(/\/$/, "");
const languageVoices = {
  "zh-CN": "zh-CN-XiaoxiaoNeural",
  "en-US": "en-US-JennyNeural",
  "ja-JP": "ja-JP-NanamiNeural",
};

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${command} failed: ${stderr || error.message}`));
        return;
      }
      resolve(stdout);
    });
  });
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function hasUsableAudio(path, task) {
  try {
    const fileStat = await stat(path);
    if (fileStat.size <= 1000) return false;
    if (task.kind !== "sentences") return true;

    try {
      const meta = JSON.parse(await readFile(`${path}.json`, "utf8"));
      return meta.text === task.text && meta.language === task.language;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

async function readScenes() {
  if (apiBase) {
    const response = await fetch(`${apiBase}/api/scenes/published`);
    if (!response.ok) {
      throw new Error(`Failed to read remote scenes: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }
  return JSON.parse(await readFile(publishedScenesFile, "utf8"));
}

async function makeMp3(text, outputPath, language) {
  await run("python3", [
    "-m",
    "edge_tts",
    "--voice",
    languageVoices[language],
    "--rate=-8%",
    "--text",
    text,
    "--write-media",
    outputPath,
  ], {
    env: {
      ...process.env,
      PYTHONPATH: pythonPackagesDir,
    },
  });
}

function getLanguageContent(item, language) {
  return {
    word: item.i18n?.[language]?.word || (language === "zh-CN" ? item.cn : item.word),
    sentence: item.i18n?.[language]?.sentence || item.sentence,
  };
}

async function main() {
  const scenes = await readScenes();
  const taskMap = new Map();

  for (const scene of scenes) {
    for (const item of scene.words || []) {
      const concept = slugify(item.word);
      if (!concept) continue;
      for (const language of Object.keys(languageVoices)) {
        const content = getLanguageContent(item, language);
        if (content.word) taskMap.set(`${language}:words:${concept}`, { language, kind: "words", concept, text: content.word });
        if (content.sentence) taskMap.set(`${language}:sentences:${concept}`, { language, kind: "sentences", concept, text: content.sentence });
      }
    }
  }

  const tasks = [...taskMap.values()];
  let created = 0;
  let skipped = 0;

  for (const [index, task] of tasks.entries()) {
    const dir = join(audioDir, task.language, task.kind);
    const outputPath = join(dir, `${task.concept}.mp3`);
    await mkdir(dir, { recursive: true });
    if (await hasUsableAudio(outputPath, task)) {
      skipped += 1;
      continue;
    }
    await makeMp3(task.text, outputPath, task.language);
    await writeFile(`${outputPath}.json`, JSON.stringify({
      language: task.language,
      kind: task.kind,
      concept: task.concept,
      text: task.text,
      updatedAt: new Date().toISOString(),
    }, null, 2));
    created += 1;
    if (created % 20 === 0 || index === tasks.length - 1) {
      console.log(`Audio progress ${index + 1}/${tasks.length}. Created ${created}, skipped ${skipped}.`);
    }
  }

  console.log(`Audio ready. Created ${created}, skipped ${skipped}.`);
  console.log(`Tasks: ${tasks.length}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
