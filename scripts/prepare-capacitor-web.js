const { cp, mkdir, rm, writeFile } = require("node:fs/promises");
const { join } = require("node:path");

const rootDir = join(__dirname, "..");
const webDir = join(rootDir, "www");
const buildType = process.argv.includes("--release") ? "release" : "debug";
const contentApiBase = process.env.CONTENT_API_BASE || "";

const entries = ["index.html", "styles.css", "app.js", "data", "audio", "assets"];

async function main() {
  await rm(webDir, { recursive: true, force: true });
  await mkdir(webDir, { recursive: true });

  for (const entry of entries) {
    await cp(join(rootDir, entry), join(webDir, entry), { recursive: true });
  }

  await writeFile(
    join(webDir, "build-env.js"),
    `window.APP_BUILD_TYPE = "${buildType}";\nwindow.CONTENT_API_BASE = ${JSON.stringify(contentApiBase)};\n`
  );

  console.log(`Prepared Capacitor ${buildType} web assets in ${webDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
