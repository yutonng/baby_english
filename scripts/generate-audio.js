const { execFile } = require("node:child_process");
const { mkdir, readFile, stat } = require("node:fs/promises");
const { join } = require("node:path");

const rootDir = join(__dirname, "..");
const appFile = join(rootDir, "app.js");
const publishedScenesFile = join(rootDir, "data", "scenes.published.json");
const audioDir = join(rootDir, "audio");
const pythonPackagesDir = join(rootDir, ".python-packages");
const voice = "en-US-JennyNeural";

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
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function hasUsableAudio(path) {
  try {
    const fileStat = await stat(path);
    return fileStat.size > 1000;
  } catch {
    return false;
  }
}

function readBundledScenes(source) {
  const start = source.indexOf("const scenes = ");
  const end = source.indexOf("];", start);
  if (start === -1 || end === -1) {
    return null;
  }

  const scenesCode = source.slice(start + "const scenes = ".length, end + 1);
  return Function(`"use strict"; return (${scenesCode});`)();
}

async function readScenes() {
  try {
    return JSON.parse(await readFile(publishedScenesFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const source = await readFile(appFile, "utf8");
  const scenes = readBundledScenes(source);
  if (!scenes) throw new Error("Could not find scenes in data/scenes.published.json or app.js");
  return scenes;
}

async function makeMp3(text, outputPath) {
  await run("python3", [
    "-m",
    "edge_tts",
    "--voice",
    voice,
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

async function main() {
  const scenes = await readScenes();
  const words = new Map();
  const sentences = new Map();

  for (const scene of scenes) {
    for (const item of scene.words) {
      words.set(slugify(item.word), item.word);
      sentences.set(slugify(item.sentence), item.sentence);
    }
  }

  await mkdir(join(audioDir, "words"), { recursive: true });
  await mkdir(join(audioDir, "sentences"), { recursive: true });

  let created = 0;
  let skipped = 0;

  for (const [slug, text] of words) {
    const outputPath = join(audioDir, "words", `${slug}.mp3`);
    if (await hasUsableAudio(outputPath)) {
      skipped += 1;
      continue;
    }
    await makeMp3(text, outputPath);
    created += 1;
  }

  for (const [slug, text] of sentences) {
    const outputPath = join(audioDir, "sentences", `${slug}.mp3`);
    if (await hasUsableAudio(outputPath)) {
      skipped += 1;
      continue;
    }
    await makeMp3(text, outputPath);
    created += 1;
  }

  console.log(`Audio ready. Created ${created}, skipped ${skipped}.`);
  console.log(`Words: ${words.size}, sentences: ${sentences.size}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
