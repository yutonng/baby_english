const { readFile, writeFile } = require("node:fs/promises");
const { join } = require("node:path");
const { enrichSceneI18n } = require("./i18n-content");

const rootDir = join(__dirname, "..");
const targets = [
  join(rootDir, "data", "scenes.drafts.json"),
  join(rootDir, "data", "scenes.published.json"),
];

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function enrichFile(filePath) {
  const scenes = await readJson(filePath);
  if (!Array.isArray(scenes)) throw new Error(`${filePath} must contain an array`);
  const enriched = scenes.map(enrichSceneI18n);
  await writeJson(filePath, enriched);
  const wordCount = enriched.reduce((total, scene) => total + (scene.words || []).length, 0);
  console.log(`enriched ${enriched.length} scenes, ${wordCount} words: ${filePath}`);
}

async function main() {
  for (const target of targets) {
    await enrichFile(target);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
