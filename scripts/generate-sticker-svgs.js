const { mkdir, readFile, writeFile } = require("node:fs/promises");
const { join } = require("node:path");

const rootDir = join(__dirname, "..");
const appFile = join(rootDir, "app.js");
const outDir = join(rootDir, "assets", "words", "sticker");

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readScenes(source) {
  const start = source.indexOf("const scenes = ");
  const end = source.indexOf("];", start);
  if (start === -1 || end === -1) throw new Error("Could not find scenes in app.js");
  const scenesCode = source.slice(start + "const scenes = ".length, end + 1);
  return Function(`"use strict"; return (${scenesCode});`)();
}

function writeScenes(source, scenes) {
  const start = source.indexOf("const scenes = ");
  const end = source.indexOf("];", start);
  const prefix = source.slice(0, start);
  const suffix = source.slice(end + 2);
  return `${prefix}const scenes = ${formatValue(scenes)};${suffix}`;
}

function formatValue(value, indent = 0) {
  const space = " ".repeat(indent);
  const next = " ".repeat(indent + 2);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `${next}${formatValue(item, indent + 2)}`).join(",\n")},\n${space}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    return `{\n${entries.map(([key, item]) => `${next}${key}: ${formatValue(item, indent + 2)}`).join(",\n")},\n${space}}`;
  }
  return JSON.stringify(value);
}

const palette = {
  ink: "#7A3E21",
  line: "#8E5529",
  red: "#F45D5D",
  redDark: "#9B2434",
  orange: "#FF971F",
  orangeDark: "#BF5D16",
  yellow: "#FFD45D",
  yellowDark: "#9F6424",
  green: "#72BD5F",
  greenDark: "#4E914C",
  blue: "#65C7F7",
  blueDark: "#3D8CB8",
  teal: "#83C5BE",
  tealDark: "#4C9A93",
  cream: "#FFF7E1",
  white: "#FFFDF2",
  gray: "#9EADB8",
  grayDark: "#64727D",
  brown: "#B87952",
  brownDark: "#734626",
};

function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${body}</svg>\n`;
}

function stroke(color = palette.line, width = 8) {
  return `stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;
}

function gloss(x = 86, y = 120) {
  return `<ellipse cx="${x}" cy="${y}" rx="14" ry="22" fill="#FFFFFF" opacity=".62"/>`;
}

function apple() {
  return svg(`<path d="M120 82c-38-25-82 12-80 66 2 57 39 88 75 75 9-3 18-3 27 0 36 13 73-18 75-75 2-54-42-91-80-66-5 3-12 3-17 0z" fill="${palette.red}" stroke="${palette.redDark}" stroke-width="8" stroke-linejoin="round"/><path d="M127 88c3-30 23-48 53-50" fill="none" ${stroke("#5E7232", 14)}/><path d="M148 67c22-24 57-22 74 1-24 22-54 22-74-1z" fill="${palette.green}" stroke="${palette.greenDark}" stroke-width="7" stroke-linejoin="round"/>${gloss(90, 125)}`);
}

function orange() {
  return svg(`<circle cx="128" cy="146" r="68" fill="${palette.orange}" stroke="${palette.orangeDark}" stroke-width="8"/><path d="M128 85c8-31 29-47 60-42" fill="none" ${stroke("#5E7232", 14)}/><path d="M146 68c23-24 58-20 74 5-25 20-55 19-74-5z" fill="${palette.green}" stroke="${palette.greenDark}" stroke-width="7" stroke-linejoin="round"/>${gloss(100, 119)}<g fill="#CF6815" opacity=".45"><circle cx="96" cy="154" r="5"/><circle cx="139" cy="112" r="4"/><circle cx="158" cy="164" r="5"/></g>`);
}

function banana() {
  return svg(`<path d="M48 105c29 72 106 103 170 40-40 78-137 93-183-14 9-1 13-11 13-26z" fill="${palette.yellow}" stroke="${palette.yellowDark}" stroke-width="8" stroke-linejoin="round"/><path d="M61 108c35 58 92 78 145 39" fill="none" stroke="#FFF1A0" stroke-width="10" stroke-linecap="round"/><path d="M62 139c30 48 84 62 136 25" fill="none" stroke="#C47825" stroke-width="8" stroke-linecap="round"/><path d="M35 128c8 6 18 8 28 4M209 148c8-5 14-12 18-22" ${stroke("#6F411B", 12)}/>`);
}

function bread() {
  return svg(`<path d="M60 113c0-37 26-64 68-64s68 27 68 64v65c0 18-13 31-31 31H91c-18 0-31-13-31-31z" fill="#D89145" stroke="${palette.line}" stroke-width="8"/><path d="M83 119c0-25 18-43 45-43s45 18 45 43v54c0 8-6 14-14 14H97c-8 0-14-6-14-14z" fill="#F3C178"/><circle cx="110" cy="132" r="7" fill="#B97836"/><circle cx="147" cy="155" r="7" fill="#B97836"/><circle cx="126" cy="176" r="6" fill="#B97836"/>`);
}

function milk() {
  return svg(`<path d="M84 56h88l18 38v99c0 16-12 28-28 28H94c-16 0-28-12-28-28V94z" fill="#EAF7FF" stroke="${palette.blueDark}" stroke-width="8" stroke-linejoin="round"/><path d="M84 56h88l-20 38H84z" fill="#BFE8FF"/><rect x="86" y="122" width="84" height="50" rx="14" fill="#FFFFFF"/><circle cx="128" cy="147" r="14" fill="#8CC8FF"/><path d="M94 82h68" ${stroke("#7DBFE3", 8)}/>`);
}

function water() {
  return svg(`<path d="M128 40c39 46 64 79 64 119 0 39-28 67-64 67s-64-28-64-67c0-40 25-73 64-119z" fill="${palette.blue}" stroke="${palette.blueDark}" stroke-width="8"/><path d="M92 152c0 27 18 43 42 43" fill="none" stroke="#D7F5FF" stroke-width="13" stroke-linecap="round"/>${gloss(107, 122)}`);
}

function egg() {
  return svg(`<ellipse cx="128" cy="142" rx="57" ry="79" fill="${palette.white}" stroke="#D8C7A4" stroke-width="8"/><path d="M84 155c13 38 45 54 82 33" fill="none" stroke="#E9DFC4" stroke-width="9" stroke-linecap="round"/><circle cx="116" cy="126" r="8" fill="#F2E0B7"/><circle cx="146" cy="164" r="6" fill="#F2E0B7"/>`);
}

function cup() {
  return svg(`<path d="M73 84h94l-11 104c-2 20-17 33-37 33s-35-13-37-33z" fill="${palette.teal}" stroke="${palette.tealDark}" stroke-width="8"/><ellipse cx="120" cy="86" rx="48" ry="15" fill="#CFF3ED" stroke="${palette.tealDark}" stroke-width="6"/><path d="M162 119h18c20 0 31 15 25 33-5 16-20 26-42 26" fill="none" stroke="${palette.tealDark}" stroke-width="13" stroke-linecap="round"/><path d="M95 123h50" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>`);
}

function bowl(fill = "#F4A261") {
  return svg(`<ellipse cx="128" cy="112" rx="78" ry="28" fill="#F8D7A8" stroke="${palette.line}" stroke-width="8"/><path d="M54 113c8 59 38 95 74 95s66-36 74-95z" fill="${fill}" stroke="${palette.line}" stroke-width="8" stroke-linejoin="round"/><ellipse cx="128" cy="113" rx="60" ry="15" fill="#FFE8C2"/><path d="M88 160h80" stroke="#D87C3D" stroke-width="10" stroke-linecap="round"/>`);
}

function plate() {
  return svg(`<circle cx="128" cy="134" r="76" fill="#BDE0FE" stroke="${palette.blueDark}" stroke-width="8"/><circle cx="128" cy="134" r="50" fill="#F9FDFF" stroke="#9AC8E8" stroke-width="7"/><circle cx="128" cy="134" r="27" fill="#E8F7FF"/><path d="M70 203h116" ${stroke("#9AC8E8", 10)}/>`);
}

function spoon() {
  return svg(`<ellipse cx="111" cy="73" rx="31" ry="43" fill="#B7C4CF" stroke="${palette.grayDark}" stroke-width="8"/><path d="M126 109l61 91" stroke="${palette.grayDark}" stroke-width="20" stroke-linecap="round"/><path d="M102 55c14-7 27 2 28 18" fill="none" stroke="#E9EEF2" stroke-width="8" stroke-linecap="round"/>`);
}

function fork() {
  return svg(`<path d="M84 48v74M112 48v74M140 48v74M84 122c0 24 56 24 56 0" fill="none" stroke="${palette.grayDark}" stroke-width="14" stroke-linecap="round"/><path d="M112 122v88" stroke="${palette.grayDark}" stroke-width="20" stroke-linecap="round"/><path d="M84 48v54M112 48v54M140 48v54" stroke="#DDE6ED" stroke-width="5" stroke-linecap="round"/>`);
}

function rice() {
  return svg(`<ellipse cx="128" cy="106" rx="70" ry="32" fill="#FFFFFF" stroke="#D8C7A4" stroke-width="7"/><circle cx="96" cy="103" r="10" fill="#F4F4E8"/><circle cx="120" cy="86" r="10" fill="#F4F4E8"/><circle cx="145" cy="103" r="10" fill="#F4F4E8"/><path d="M56 120c10 54 38 88 72 88s62-34 72-88z" fill="#91D7C3" stroke="${palette.tealDark}" stroke-width="8"/><ellipse cx="128" cy="120" rx="72" ry="24" fill="#C9F0E4" stroke="${palette.tealDark}" stroke-width="6"/>`);
}

function soup() {
  return svg(`<path d="M60 112c8 58 36 94 68 94s60-36 68-94z" fill="#E76F51" stroke="#A94C35" stroke-width="8"/><ellipse cx="128" cy="112" rx="74" ry="28" fill="${palette.yellow}" stroke="#A94C35" stroke-width="7"/><circle cx="103" cy="111" r="9" fill="${palette.green}"/><circle cx="133" cy="104" r="8" fill="#F9844A"/><circle cx="158" cy="115" r="7" fill="#FFFFFF"/><path d="M94 57c-15 19 14 25 0 44M130 50c-15 19 14 25 0 44M166 57c-15 19 14 25 0 44" fill="none" stroke="#B7B7A4" stroke-width="8" stroke-linecap="round"/>`);
}

function sofa() {
  return svg(`<rect x="54" y="106" width="148" height="72" rx="25" fill="#FF9B9B" stroke="#A94C5A" stroke-width="8"/><rect x="74" y="82" width="108" height="60" rx="22" fill="#FFB4B4" stroke="#A94C5A" stroke-width="8"/><path d="M66 178v24M190 178v24" ${stroke("#7A3E42", 10)}/><path d="M87 136h82" stroke="#FFF0F0" stroke-width="9" stroke-linecap="round"/>`);
}

function tv() {
  return svg(`<rect x="48" y="70" width="160" height="112" rx="18" fill="#4A5568" stroke="#26313D" stroke-width="8"/><rect x="66" y="88" width="124" height="76" rx="10" fill="#9DE2FF"/><path d="M96 210h64M128 183v27" ${stroke("#26313D", 10)}/><circle cx="178" cy="174" r="5" fill="#FFD166"/>`);
}

function table() {
  return svg(`<ellipse cx="128" cy="84" rx="78" ry="22" fill="#D9975D" stroke="${palette.line}" stroke-width="8"/><rect x="54" y="82" width="148" height="36" rx="16" fill="#B87842" stroke="${palette.line}" stroke-width="8"/><path d="M76 116v82M180 116v82" ${stroke("#7A4729", 14)}/><path d="M50 198h156" ${stroke("#6E432B", 12)}/>`);
}

function chair() {
  return svg(`<rect x="82" y="62" width="92" height="78" rx="20" fill="#F6BD60" stroke="${palette.line}" stroke-width="8"/><rect x="70" y="128" width="116" height="44" rx="16" fill="#E69B45" stroke="${palette.line}" stroke-width="8"/><path d="M88 172v36M168 172v36" ${stroke("#7A4729", 12)}/>`);
}

function lamp() {
  return svg(`<path d="M86 84h84l-22 58h-40z" fill="#FFD166" stroke="#A86A20" stroke-width="8"/><path d="M128 142v48M96 202h64" ${stroke("#6C757D", 12)}/><path d="M74 82h108" ${stroke("#A86A20", 8)}/>`);
}

function book() {
  return svg(`<path d="M54 66h70c16 0 28 12 28 28v112H82c-16 0-28-12-28-28z" fill="#65C7F7" stroke="${palette.blueDark}" stroke-width="8"/><path d="M152 94c0-16 12-28 28-28h22v140h-50z" fill="#8BD7C5" stroke="${palette.tealDark}" stroke-width="8"/><path d="M82 104h42M82 134h42" ${stroke("#FFFFFF", 8)}/>`);
}

function toy() {
  return svg(`<circle cx="128" cy="132" r="56" fill="#F6BD60" stroke="${palette.line}" stroke-width="8"/><circle cx="106" cy="118" r="8" fill="#26313D"/><circle cx="150" cy="118" r="8" fill="#26313D"/><path d="M108 150c12 16 28 16 40 0" fill="none" ${stroke("#8D5524", 8)}/><circle cx="80" cy="90" r="24" fill="#F6BD60" stroke="${palette.line}" stroke-width="8"/><circle cx="176" cy="90" r="24" fill="#F6BD60" stroke="${palette.line}" stroke-width="8"/>`);
}

function ball() {
  return svg(`<circle cx="128" cy="134" r="72" fill="#FFFFFF" stroke="#26313D" stroke-width="8"/><path d="M128 62v144M62 134h132M83 86c30 28 30 68 0 96M173 86c-30 28-30 68 0 96" fill="none" stroke="#26313D" stroke-width="7"/><path d="M128 62c24 15 36 39 36 72s-12 57-36 72" fill="none" stroke="#FF6B6B" stroke-width="12" opacity=".8"/>`);
}

function box() {
  return svg(`<path d="M54 94l74-42 74 42-74 42z" fill="#F6BD60" stroke="${palette.line}" stroke-width="8"/><path d="M54 94v86l74 42v-86z" fill="#E9A34E" stroke="${palette.line}" stroke-width="8"/><path d="M202 94v86l-74 42v-86z" fill="#D88F3E" stroke="${palette.line}" stroke-width="8"/><path d="M96 70l74 42" ${stroke("#FFE2A3", 8)}/>`);
}

function clock() {
  return svg(`<circle cx="128" cy="132" r="72" fill="#FFFDF2" stroke="${palette.blueDark}" stroke-width="9"/><circle cx="128" cy="132" r="7" fill="${palette.blueDark}"/><path d="M128 88v45l34 22" ${stroke("#26313D", 10)}/><path d="M92 58l-24 24M164 58l24 24" ${stroke("#F6BD60", 12)}/>`);
}

function windowIcon() {
  return svg(`<rect x="58" y="58" width="140" height="140" rx="18" fill="#BDE0FE" stroke="${palette.blueDark}" stroke-width="8"/><path d="M128 62v132M62 128h132" ${stroke("#FFFFFF", 8)}/><path d="M78 88c18-15 41-18 66-8" fill="none" stroke="#DDF6FF" stroke-width="8" stroke-linecap="round"/>`);
}

function door() {
  return svg(`<rect x="78" y="44" width="102" height="172" rx="14" fill="#B87952" stroke="${palette.line}" stroke-width="8"/><circle cx="154" cy="136" r="7" fill="#FFD166"/><path d="M94 64h44" ${stroke("#DCA06E", 8)}/>`);
}

function bed() {
  return svg(`<rect x="48" y="112" width="160" height="70" rx="18" fill="#8CC8FF" stroke="${palette.blueDark}" stroke-width="8"/><rect x="58" y="86" width="72" height="46" rx="16" fill="#FFFFFF" stroke="#BDE0FE" stroke-width="7"/><path d="M56 182v24M200 182v24" ${stroke("#5A6C7D", 10)}/>`);
}

function pillow() {
  return svg(`<rect x="54" y="82" width="148" height="94" rx="34" fill="#FFFFFF" stroke="#BDE0FE" stroke-width="8"/><path d="M78 114c18-16 78-18 100 4" fill="none" stroke="#E6F6FF" stroke-width="10" stroke-linecap="round"/>`);
}

function clothing(kind) {
  const colors = { pajamas: "#8CC8FF", shirt: "#65C7F7", pants: "#4A7EBB", socks: "#FFFFFF", shoes: "#F45D5D" };
  const c = colors[kind] || "#8CC8FF";
  if (kind === "pants") return svg(`<path d="M86 58h84l-8 150h-40l-6-72-16 72H60z" fill="${c}" stroke="#2E5F99" stroke-width="8" stroke-linejoin="round"/>`);
  if (kind === "socks") return svg(`<path d="M76 58h52v98c0 26-20 46-48 46H58v-40h18zM140 58h52v98c0 26-20 46-48 46h-22v-40h18z" fill="#FFFFFF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M76 88h52M140 88h52" ${stroke("#FF9B9B", 8)}/>`);
  if (kind === "shoes") return svg(`<path d="M54 146c34-12 58-38 84-38 28 0 54 28 62 60H54z" fill="${c}" stroke="${palette.redDark}" stroke-width="8"/><path d="M78 138h52" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>`);
  return svg(`<path d="M96 62l32 24 32-24 44 38-28 34-18-14v88H98v-88l-18 14-28-34z" fill="${c}" stroke="${palette.blueDark}" stroke-width="8" stroke-linejoin="round"/><path d="M112 82c8 8 24 8 32 0" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>`);
}

function mirror() {
  return svg(`<ellipse cx="128" cy="116" rx="52" ry="68" fill="#DDF6FF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M96 100c12-20 32-30 58-26" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/><path d="M128 184v26M94 214h68" ${stroke("#8D6E63", 12)}/>`);
}

function bag() {
  return svg(`<rect x="70" y="82" width="116" height="126" rx="26" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="8"/><path d="M98 86c0-26 60-26 60 0" fill="none" ${stroke("#7A3E42", 10)}/><rect x="94" y="128" width="68" height="42" rx="14" fill="#FFD166" stroke="#B98420" stroke-width="7"/>`);
}

function sleep() {
  return svg(`<path d="M80 150c18 36 74 54 112 4-14 54-72 82-124 46-42-30-42-94 0-124-20 28-16 52 12 74z" fill="#8CC8FF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M154 66h34l-34 42h38M92 48h28L92 82h32" ${stroke("#7A3E8A", 8)}/>`);
}

function pencil() {
  return svg(`<path d="M58 180l92-112 36 30-92 112-46 14z" fill="#FFD166" stroke="${palette.line}" stroke-width="8" stroke-linejoin="round"/><path d="M150 68l18-22 36 30-18 22z" fill="#F45D5D" stroke="${palette.line}" stroke-width="8"/><path d="M48 224l10-44 36 30z" fill="#8D6E63"/>`);
}

function crayon() {
  return svg(`<rect x="86" y="54" width="84" height="148" rx="18" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="8"/><path d="M92 86h72M92 170h72" stroke="#FFD166" stroke-width="9"/><path d="M98 54l30-28 30 28z" fill="#FFB4B4" stroke="${palette.redDark}" stroke-width="8"/>`);
}

function paper() {
  return svg(`<path d="M72 42h82l42 42v130H72z" fill="#FFFFFF" stroke="${palette.grayDark}" stroke-width="8" stroke-linejoin="round"/><path d="M154 42v42h42" fill="#DDF6FF" stroke="${palette.grayDark}" stroke-width="8" stroke-linejoin="round"/><path d="M94 116h78M94 146h78M94 176h50" ${stroke("#B7C4CF", 8)}/>`);
}

function blocks() {
  return svg(`<rect x="52" y="130" width="58" height="58" rx="12" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="8"/><rect x="110" y="80" width="58" height="58" rx="12" fill="#FFD166" stroke="${palette.line}" stroke-width="8"/><rect x="148" y="138" width="58" height="58" rx="12" fill="${palette.blue}" stroke="${palette.blueDark}" stroke-width="8"/><circle cx="81" cy="159" r="8" fill="#FFFFFF" opacity=".7"/><circle cx="139" cy="109" r="8" fill="#FFFFFF" opacity=".7"/><circle cx="177" cy="167" r="8" fill="#FFFFFF" opacity=".7"/>`);
}

function music() {
  return svg(`<path d="M104 72v92" ${stroke("#7A3E8A", 14)}/><path d="M104 72l72-18v92" fill="none" ${stroke("#7A3E8A", 14)}/><circle cx="88" cy="174" r="24" fill="#F45D5D" stroke="#7A3E8A" stroke-width="8"/><circle cx="160" cy="156" r="24" fill="#FFD166" stroke="#7A3E8A" stroke-width="8"/>`);
}

function person(kind = "child") {
  const body = kind === "teacher" ? "#8CC8FF" : "#FFD166";
  return svg(`<circle cx="128" cy="82" r="38" fill="#F2B68E" stroke="${palette.line}" stroke-width="8"/><path d="M70 214c8-52 34-82 58-82s50 30 58 82z" fill="${body}" stroke="${palette.line}" stroke-width="8"/><circle cx="114" cy="78" r="5" fill="#26313D"/><circle cx="142" cy="78" r="5" fill="#26313D"/><path d="M112 98c10 8 22 8 32 0" fill="none" ${stroke("#7A3E21", 7)}/><path d="M92 62c12-28 58-30 76 0" fill="none" stroke="#5B3A28" stroke-width="12" stroke-linecap="round"/>`);
}

function animal(kind) {
  const color = {
    lion: "#D99A3D", tiger: "#F0932B", monkey: "#A66A43", panda: "#FFFFFF", elephant: "#9EADB8", giraffe: "#E7B65B", zebra: "#FFFFFF", bear: "#9A6A45", rabbit: "#FFFFFF", bird: "#65C7F7", duck: "#FFD45D", fish: "#65C7F7", snake: "#72BD5F", dog: "#B87952", cat: "#F6BD60", horse: "#B87952", butterfly: "#FF8FAB", insect: "#72BD5F", spider: "#6C757D", turtle: "#72BD5F", whale: "#4D96A9", shark: "#7B8794"
  }[kind] || "#F6BD60";
  if (kind === "fish") return svg(`<path d="M54 132c38-46 100-46 142 0-42 46-104 46-142 0z" fill="${color}" stroke="${palette.blueDark}" stroke-width="8"/><path d="M196 132l36-32v64z" fill="${color}" stroke="${palette.blueDark}" stroke-width="8"/><circle cx="94" cy="122" r="6" fill="#26313D"/>`);
  if (kind === "lion") return svg(`<circle cx="128" cy="128" r="70" fill="#B96F2D" stroke="#7A431E" stroke-width="8"/><circle cx="128" cy="132" r="48" fill="#F6BD60" stroke="#7A431E" stroke-width="7"/><circle cx="82" cy="84" r="24" fill="#B96F2D" stroke="#7A431E" stroke-width="8"/><circle cx="174" cy="84" r="24" fill="#B96F2D" stroke="#7A431E" stroke-width="8"/><circle cx="111" cy="124" r="6" fill="#26313D"/><circle cx="145" cy="124" r="6" fill="#26313D"/><path d="M128 134l-8 10h16z" fill="#7A431E"/><path d="M108 152c12 12 28 12 40 0" fill="none" ${stroke("#7A431E", 7)}/>`);
  if (kind === "tiger") return svg(`<circle cx="128" cy="132" r="64" fill="#F0932B" stroke="#8A4E20" stroke-width="8"/><circle cx="82" cy="86" r="24" fill="#F0932B" stroke="#8A4E20" stroke-width="8"/><circle cx="174" cy="86" r="24" fill="#F0932B" stroke="#8A4E20" stroke-width="8"/><path d="M104 82l12 26M128 70v32M152 82l-12 26M82 130l28 10M174 130l-28 10" ${stroke("#5A311A", 7)}/><circle cx="111" cy="126" r="6" fill="#26313D"/><circle cx="145" cy="126" r="6" fill="#26313D"/><path d="M128 136l-8 10h16z" fill="#5A311A"/><path d="M110 154c10 10 26 10 36 0" fill="none" ${stroke("#5A311A", 7)}/>`);
  if (kind === "monkey") return svg(`<circle cx="128" cy="130" r="62" fill="#A66A43" stroke="#6F3F25" stroke-width="8"/><circle cx="82" cy="92" r="27" fill="#A66A43" stroke="#6F3F25" stroke-width="8"/><circle cx="174" cy="92" r="27" fill="#A66A43" stroke="#6F3F25" stroke-width="8"/><ellipse cx="128" cy="148" rx="44" ry="36" fill="#D8A06F" stroke="#6F3F25" stroke-width="7"/><circle cx="110" cy="124" r="6" fill="#26313D"/><circle cx="146" cy="124" r="6" fill="#26313D"/><path d="M110 154c12 14 24 14 36 0" fill="none" ${stroke("#6F3F25", 7)}/>`);
  if (kind === "elephant") return svg(`<circle cx="76" cy="132" r="38" fill="#B7C4CF" stroke="${palette.grayDark}" stroke-width="8"/><circle cx="180" cy="132" r="38" fill="#B7C4CF" stroke="${palette.grayDark}" stroke-width="8"/><ellipse cx="128" cy="126" rx="58" ry="54" fill="#9EADB8" stroke="${palette.grayDark}" stroke-width="8"/><path d="M128 148c14 28 8 58-16 72" fill="none" ${stroke("#7F8D98", 20)}/><circle cx="110" cy="116" r="5" fill="#26313D"/><circle cx="146" cy="116" r="5" fill="#26313D"/><path d="M82 164l-28 28M174 164l28 28" ${stroke("#F8F4E3", 10)}/><path d="M102 94c18-14 36-14 54 0" fill="none" stroke="#C8D2DA" stroke-width="8" stroke-linecap="round"/>`);
  if (kind === "giraffe") return svg(`<path d="M92 214V100c0-30 20-50 50-50h32c22 0 36 14 36 34s-14 34-36 34h-34v96z" fill="${color}" stroke="${palette.line}" stroke-width="8"/><path d="M110 214h-34v-62c0-20 16-36 36-36h28" fill="${color}" stroke="${palette.line}" stroke-width="8"/><g fill="#9A5E2D"><circle cx="118" cy="96" r="7"/><circle cx="122" cy="142" r="8"/><circle cx="152" cy="78" r="7"/><circle cx="166" cy="110" r="6"/></g><path d="M150 50l-10-22M178 54l16-18" ${stroke("#7A431E", 8)}/><circle cx="178" cy="82" r="5" fill="#26313D"/>`);
  if (kind === "snake") return svg(`<path d="M48 158c38-50 78 28 118-18 34-38-4-80-48-54" fill="none" stroke="${color}" stroke-width="34" stroke-linecap="round"/><path d="M48 158c38-50 78 28 118-18 34-38-4-80-48-54" fill="none" stroke="${palette.greenDark}" stroke-width="8" stroke-linecap="round"/><circle cx="154" cy="82" r="5" fill="#26313D"/>`);
  if (kind === "bird" || kind === "duck") return svg(`<ellipse cx="124" cy="136" rx="58" ry="48" fill="${color}" stroke="${kind === "duck" ? palette.yellowDark : palette.blueDark}" stroke-width="8"/><circle cx="90" cy="102" r="32" fill="${color}" stroke="${kind === "duck" ? palette.yellowDark : palette.blueDark}" stroke-width="8"/><path d="M62 104l-28 16 28 14z" fill="#F9844A" stroke="#B45B25" stroke-width="7"/><circle cx="96" cy="96" r="5" fill="#26313D"/><path d="M142 144c22-8 40 0 54 22" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>`);
  if (kind === "butterfly") return svg(`<ellipse cx="92" cy="110" rx="38" ry="50" fill="#FF8FAB" stroke="#9B3A5A" stroke-width="8"/><ellipse cx="164" cy="110" rx="38" ry="50" fill="#8ECAE6" stroke="#3D8CB8" stroke-width="8"/><ellipse cx="108" cy="164" rx="30" ry="34" fill="#FFC2D1" stroke="#9B3A5A" stroke-width="7"/><ellipse cx="148" cy="164" rx="30" ry="34" fill="#BDE0FE" stroke="#3D8CB8" stroke-width="7"/><rect x="121" y="78" width="14" height="100" rx="7" fill="#4A4E69"/>`);
  if (kind === "spider") return svg(`<circle cx="128" cy="132" r="42" fill="#6C757D" stroke="#343A40" stroke-width="8"/><circle cx="128" cy="84" r="28" fill="#7B8794" stroke="#343A40" stroke-width="8"/><path d="M92 126H54M164 126h38M96 150l-38 30M160 150l38 30M102 104L70 78M154 104l32-26" ${stroke("#343A40", 8)}/><circle cx="118" cy="80" r="4" fill="#FFFFFF"/><circle cx="138" cy="80" r="4" fill="#FFFFFF"/>`);
  if (kind === "whale" || kind === "shark") return svg(`<path d="M46 138c34-54 120-58 164-8 12 14 6 35-12 42-42 15-116 14-152-34z" fill="${color}" stroke="${palette.blueDark}" stroke-width="8"/><path d="M204 128l28-24v50z" fill="${color}" stroke="${palette.blueDark}" stroke-width="8"/><circle cx="88" cy="126" r="5" fill="#26313D"/><path d="M76 154h74" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>`);
  if (kind === "zebra") return svg(`<ellipse cx="128" cy="138" rx="68" ry="46" fill="#FFFFFF" stroke="#26313D" stroke-width="8"/><circle cx="80" cy="102" r="30" fill="#FFFFFF" stroke="#26313D" stroke-width="8"/><path d="M96 94l-26 24M126 96l-28 72M158 106l-32 66M184 126l-30 42" ${stroke("#26313D", 7)}/><circle cx="72" cy="96" r="5" fill="#26313D"/>`);
  if (kind === "panda") return svg(`<circle cx="128" cy="128" r="62" fill="#FFFFFF" stroke="#26313D" stroke-width="8"/><circle cx="84" cy="76" r="24" fill="#26313D"/><circle cx="172" cy="76" r="24" fill="#26313D"/><ellipse cx="106" cy="120" rx="18" ry="22" fill="#26313D"/><ellipse cx="150" cy="120" rx="18" ry="22" fill="#26313D"/><circle cx="128" cy="142" r="9" fill="#26313D"/>`);
  return svg(`<ellipse cx="128" cy="138" rx="68" ry="54" fill="${color}" stroke="${palette.line}" stroke-width="8"/><circle cx="86" cy="90" r="28" fill="${color}" stroke="${palette.line}" stroke-width="8"/><circle cx="170" cy="90" r="28" fill="${color}" stroke="${palette.line}" stroke-width="8"/><circle cx="110" cy="125" r="6" fill="#26313D"/><circle cx="146" cy="125" r="6" fill="#26313D"/><path d="M112 152c10 10 22 10 32 0" fill="none" ${stroke("#7A3E21", 7)}/>`);
}

function vehicle(kind) {
  const c = kind.includes("fire") ? "#F45D5D" : kind.includes("ambulance") ? "#FFFFFF" : kind.includes("taxi") ? "#FFD45D" : "#65C7F7";
  if (kind === "plane" || kind === "fighter-jet" || kind === "bomber") return svg(`<path d="M34 138l184-70-54 70 54 70z" fill="${kind === "bomber" ? "#84996F" : "#7A8FA6"}" stroke="${palette.grayDark}" stroke-width="8" stroke-linejoin="round"/><path d="M106 138L66 90l94 28zM106 138l-40 48 94-28z" fill="#B7C4CF" stroke="${palette.grayDark}" stroke-width="7" stroke-linejoin="round"/><circle cx="154" cy="126" r="8" fill="#DDF6FF"/>`);
  if (kind === "rocket" || kind === "missile") return svg(`<path d="M128 34c40 36 42 104 12 148h-24C86 138 88 70 128 34z" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="8"/><circle cx="128" cy="92" r="17" fill="#BDE0FE" stroke="${palette.blueDark}" stroke-width="6"/><path d="M116 180l-28 36v-58zM140 180l28 36v-58z" fill="#7B8794" stroke="${palette.grayDark}" stroke-width="7"/><path d="M116 208h24l-12 32z" fill="#FFD166"/>`);
  if (kind === "boat" || kind === "ship") return svg(`<path d="M44 144h168l-28 52H72z" fill="#4D96A9" stroke="${palette.blueDark}" stroke-width="8"/><rect x="92" y="86" width="72" height="58" rx="12" fill="#9AD0EC" stroke="${palette.blueDark}" stroke-width="7"/><circle cx="108" cy="166" r="8" fill="#FFFFFF"/><circle cx="142" cy="166" r="8" fill="#FFFFFF"/><path d="M32 208c28 12 54 12 82 0s54-12 110 0" fill="none" stroke="#73C2D6" stroke-width="10" stroke-linecap="round"/>`);
  if (kind === "bike") return svg(`<circle cx="78" cy="166" r="36" fill="none" stroke="${palette.grayDark}" stroke-width="10"/><circle cx="178" cy="166" r="36" fill="none" stroke="${palette.grayDark}" stroke-width="10"/><path d="M78 166l42-58 30 58H78l42 0 58-48M120 108h38" fill="none" ${stroke("#F45D5D", 9)}/>`);
  if (kind === "scooter") return svg(`<path d="M88 58v92h80M72 190h112" fill="none" ${stroke("#65C7F7", 13)}/><circle cx="74" cy="190" r="18" fill="#9EADB8" stroke="${palette.grayDark}" stroke-width="8"/><circle cx="184" cy="190" r="18" fill="#9EADB8" stroke="${palette.grayDark}" stroke-width="8"/><path d="M88 58h42" ${stroke("#65C7F7", 13)}/>`);
  if (kind === "train" || kind === "subway") return svg(`<rect x="54" y="62" width="148" height="120" rx="22" fill="#65C7F7" stroke="${palette.blueDark}" stroke-width="8"/><rect x="76" y="86" width="104" height="48" rx="10" fill="#DDF6FF"/><path d="M82 210h92M98 182l-22 28M158 182l22 28" ${stroke("#64727D", 10)}/><circle cx="92" cy="154" r="9" fill="#FFD166"/><circle cx="164" cy="154" r="9" fill="#FFD166"/>`);
  return svg(`<rect x="44" y="112" width="168" height="58" rx="18" fill="${c}" stroke="${kind.includes("ambulance") ? palette.redDark : palette.blueDark}" stroke-width="8"/><path d="M82 112l22-38h66l28 38z" fill="${c}" stroke="${kind.includes("ambulance") ? palette.redDark : palette.blueDark}" stroke-width="8"/><rect x="112" y="84" width="32" height="24" rx="6" fill="#DDF6FF"/><circle cx="82" cy="174" r="20" fill="#343A40"/><circle cx="174" cy="174" r="20" fill="#343A40"/>${kind.includes("ambulance") ? '<path d="M126 126v28M112 140h28" stroke="#F45D5D" stroke-width="8" stroke-linecap="round"/>' : ""}`);
}

function sign(kind) {
  if (["left", "right", "up", "down"].includes(kind)) {
    const rot = { left: 180, up: 270, down: 90, right: 0 }[kind];
    return svg(`<circle cx="128" cy="128" r="74" fill="#65C7F7" stroke="${palette.blueDark}" stroke-width="8"/><path d="M82 128h82M140 92l42 36-42 36" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" transform="rotate(${rot} 128 128)"/>`);
  }
  if (kind === "stop" || kind === "no") return svg(`<path d="M96 50h64l46 46v64l-46 46H96l-46-46V96z" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="8"/><path d="M84 128h88" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round"/>`);
  if (kind === "go") return svg(`<circle cx="128" cy="128" r="74" fill="${palette.green}" stroke="${palette.greenDark}" stroke-width="8"/><path d="M96 132l24 24 48-58" fill="none" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`);
  if (kind === "push" || kind === "pull") return svg(`<rect x="58" y="50" width="112" height="156" rx="16" fill="#B87952" stroke="${palette.line}" stroke-width="8"/><path d="M122 128h82M180 94l34 34-34 34" fill="none" stroke="#FFD166" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" transform="${kind === "pull" ? "rotate(180 162 128)" : ""}"/><circle cx="146" cy="128" r="6" fill="#FFD166"/>`);
  return svg(`<rect x="52" y="58" width="152" height="112" rx="18" fill="#FFFFFF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M128 170v42" ${stroke("#64727D", 12)}/><path d="M86 114h84M140 86l34 28-34 28" fill="none" stroke="${palette.blueDark}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`);
}

function museum(kind) {
  if (kind === "tank") return svg(`<rect x="48" y="126" width="136" height="48" rx="16" fill="#708D55" stroke="#4E6A3D" stroke-width="8"/><rect x="80" y="92" width="66" height="44" rx="14" fill="#7FA363" stroke="#4E6A3D" stroke-width="8"/><rect x="138" y="108" width="70" height="12" rx="6" fill="#4E6A3D"/><circle cx="78" cy="176" r="14" fill="#343A40"/><circle cx="118" cy="176" r="14" fill="#343A40"/><circle cx="158" cy="176" r="14" fill="#343A40"/>`);
  if (kind === "gun" || kind === "cannon") return svg(`<rect x="58" y="104" width="128" height="28" rx="10" fill="#7B8794" stroke="${palette.grayDark}" stroke-width="8"/><rect x="174" y="113" width="42" height="10" rx="5" fill="${palette.grayDark}"/><rect x="88" y="130" width="28" height="52" rx="8" fill="${palette.brown}" stroke="${palette.brownDark}" stroke-width="7"/><path d="M124 132c0 24 22 30 22 30" fill="none" ${stroke("#495057", 8)}/>`);
  if (kind === "sea-mine") return svg(`<circle cx="128" cy="136" r="50" fill="#4A5568" stroke="#26313D" stroke-width="8"/><g stroke="#4A5568" stroke-width="12" stroke-linecap="round"><path d="M128 60V34"/><path d="M128 238v-26"/><path d="M52 136H26"/><path d="M230 136h-26"/><path d="M74 82L56 64"/><path d="M200 208l-18-18"/><path d="M182 82l18-18"/><path d="M56 208l18-18"/></g><circle cx="110" cy="118" r="9" fill="#718096"/>`);
  if (kind === "helmet") return svg(`<path d="M54 146c4-56 42-88 82-88s70 32 72 88z" fill="#6B8E4E" stroke="#4E6A3D" stroke-width="8"/><path d="M50 146h164v24H50z" fill="#4F6F39" stroke="#4E6A3D" stroke-width="8"/><path d="M96 66c24 24 26 54 20 80" fill="none" stroke="#87A967" stroke-width="8"/>`);
  if (kind === "sword") return svg(`<path d="M136 36l28 24-62 110-24-24z" fill="#BAC8D3" stroke="${palette.grayDark}" stroke-width="8"/><rect x="70" y="154" width="88" height="18" rx="9" transform="rotate(45 114 163)" fill="#F4A261" stroke="${palette.line}" stroke-width="7"/><rect x="58" y="184" width="40" height="30" rx="10" transform="rotate(45 78 199)" fill="${palette.brown}" stroke="${palette.brownDark}" stroke-width="7"/>`);
  return null;
}

function nature(kind) {
  if (kind === "dinosaur") return svg(`<path d="M54 144c22-42 72-54 118-24l24-28 20 18-34 44c-34 30-92 28-128-10z" fill="${palette.green}" stroke="${palette.greenDark}" stroke-width="8"/><circle cx="178" cy="94" r="24" fill="${palette.green}" stroke="${palette.greenDark}" stroke-width="8"/><circle cx="186" cy="88" r="5" fill="#26313D"/><path d="M88 168v30M146 166v32" ${stroke(palette.greenDark, 13)}/><path d="M58 140l-26 24" ${stroke(palette.green, 14)}/>`);
  if (kind === "bone") return svg(`<path d="M78 100l78 58" stroke="#F8F4E3" stroke-width="30" stroke-linecap="round"/><circle cx="62" cy="88" r="22" fill="#F8F4E3" stroke="#D8C7A4" stroke-width="7"/><circle cx="88" cy="84" r="22" fill="#F8F4E3" stroke="#D8C7A4" stroke-width="7"/><circle cx="168" cy="172" r="22" fill="#F8F4E3" stroke="#D8C7A4" stroke-width="7"/><circle cx="194" cy="168" r="22" fill="#F8F4E3" stroke="#D8C7A4" stroke-width="7"/>`);
  if (kind === "fossil") return svg(`<ellipse cx="128" cy="132" rx="82" ry="62" fill="#C9A66B" stroke="#7D6443" stroke-width="8"/><path d="M76 138c30-48 82-50 108-10-22 34-72 40-108 10z" fill="none" ${stroke("#7D6443", 10)}/><path d="M102 120l22 28 34-46" fill="none" ${stroke("#7D6443", 8)}/>`);
  if (kind === "rock") return svg(`<path d="M58 170l28-62 58-34 54 44 16 52z" fill="#9AA0A6" stroke="${palette.grayDark}" stroke-width="8"/><path d="M86 108l48 14 10-48" fill="none" ${stroke("#7B8088", 7)}/>`);
  if (kind === "shell") return svg(`<path d="M54 170c8-62 42-100 74-100s66 38 74 100z" fill="#F4A8A8" stroke="#B95C5C" stroke-width="8"/><g stroke="#D97878" stroke-width="7" stroke-linecap="round"><path d="M128 70v100"/><path d="M100 78l28 92"/><path d="M156 78l-28 92"/><path d="M76 124l52 46"/><path d="M180 124l-52 46"/></g><rect x="50" y="166" width="156" height="18" rx="9" fill="#D97878"/>`);
  if (kind === "volcano") return svg(`<path d="M54 202l56-118h36l56 118z" fill="#8D6E63" stroke="${palette.line}" stroke-width="8"/><path d="M110 84h36l16 34c-22 14-42 14-68 0z" fill="#E76F51"/><path d="M126 72c-16-22 18-26 2-48M154 76c22-20-8-34 14-50" fill="none" stroke="#B7B7A4" stroke-width="9" stroke-linecap="round"/>`);
  if (kind === "mountain") return svg(`<path d="M38 202l68-116 40 66 22-34 50 84z" fill="#7CA982" stroke="${palette.greenDark}" stroke-width="8"/><path d="M106 86l18 30-34 18zM168 118l18 30-34-4z" fill="#F8F4E3"/>`);
  return null;
}

function bathroom(kind) {
  if (kind === "toilet") return svg(`<rect x="86" y="54" width="84" height="70" rx="18" fill="#FFFFFF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M78 116h100c0 48-24 82-50 82s-50-34-50-82z" fill="#EAF7FF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M94 210h68" ${stroke(palette.blueDark, 10)}/>`);
  if (kind === "sink") return svg(`<ellipse cx="128" cy="126" rx="72" ry="38" fill="#FFFFFF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M94 126c6 26 22 42 34 42s28-16 34-42" fill="#EAF7FF"/><path d="M128 58v36M104 94h48" ${stroke("#7B8794", 10)}/><circle cx="128" cy="126" r="7" fill="${palette.blueDark}"/>`);
  if (kind === "soap") return svg(`<rect x="66" y="112" width="124" height="70" rx="30" fill="#8BD7C5" stroke="${palette.tealDark}" stroke-width="8"/><circle cx="90" cy="82" r="12" fill="#BDE0FE" stroke="${palette.blueDark}" stroke-width="6"/><circle cx="128" cy="62" r="16" fill="#BDE0FE" stroke="${palette.blueDark}" stroke-width="6"/><circle cx="166" cy="88" r="10" fill="#BDE0FE" stroke="${palette.blueDark}" stroke-width="6"/>`);
  if (kind === "towel") return svg(`<rect x="78" y="58" width="100" height="150" rx="16" fill="#8CC8FF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M98 92h60M98 122h60" stroke="#DDF6FF" stroke-width="8" stroke-linecap="round"/><path d="M86 196c20 18 64 18 84 0" fill="none" ${stroke("#5AA6D6", 8)}/>`);
  if (kind === "bath" || kind === "shower") return svg(`<path d="M50 126h156v28c0 34-28 62-62 62h-32c-34 0-62-28-62-62z" fill="#DDF6FF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M74 126V86c0-22 18-40 40-40" fill="none" ${stroke("#7B8794", 10)}/><path d="M150 72c24 12 40 30 48 54" fill="none" ${stroke("#65C7F7", 8)}/><circle cx="94" cy="112" r="10" fill="#FFFFFF"/><circle cx="122" cy="104" r="8" fill="#FFFFFF"/>`);
  if (kind === "toothbrush") return svg(`<path d="M72 188l90-122" ${stroke("#65C7F7", 18)}/><rect x="148" y="42" width="46" height="40" rx="10" fill="#FFFFFF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M156 52v20M172 52v20M188 52v20" ${stroke("#8BD7C5", 5)}/>`);
  if (kind === "toothpaste") return svg(`<path d="M62 146l96-68 36 52-96 68z" fill="#FFFFFF" stroke="${palette.blueDark}" stroke-width="8"/><path d="M154 78l20-14 36 52-20 14z" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="8"/><path d="M94 144l44-30" ${stroke("#65C7F7", 8)}/>`);
  if (kind === "comb") return svg(`<rect x="60" y="82" width="136" height="38" rx="18" fill="#F6BD60" stroke="${palette.line}" stroke-width="8"/><path d="M78 120v72M102 120v56M126 120v72M150 120v56M174 120v72" ${stroke(palette.line, 8)}/>`);
  if (kind === "clean") return svg(`<path d="M128 48l18 48 50 8-38 34 12 50-42-26-42 26 12-50-38-34 50-8z" fill="#FFD166" stroke="#B98420" stroke-width="8"/><circle cx="84" cy="66" r="10" fill="#BDE0FE"/><circle cx="184" cy="78" r="12" fill="#BDE0FE"/>`);
  return null;
}

function playground(kind) {
  if (kind === "slide") return svg(`<path d="M76 58h74v54H76z" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="8"/><path d="M150 112c6 46 26 68 58 72H86c34-14 56-38 64-72z" fill="#FFD166" stroke="${palette.line}" stroke-width="8"/><path d="M76 58v144M150 58v54" ${stroke("#7B8794", 9)}/>`);
  if (kind === "swing") return svg(`<path d="M64 202L128 50l64 152M88 82h80" fill="none" ${stroke("#7B8794", 10)}/><path d="M102 86v64M154 86v64" ${stroke("#7B8794", 7)}/><rect x="92" y="148" width="72" height="18" rx="9" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="7"/>`);
  if (kind === "seesaw") return svg(`<path d="M62 142h132" ${stroke("#F45D5D", 16)}/><path d="M128 142l-32 58h64z" fill="#FFD166" stroke="${palette.line}" stroke-width="8"/><circle cx="72" cy="126" r="14" fill="#65C7F7" stroke="${palette.blueDark}" stroke-width="7"/><circle cx="184" cy="126" r="14" fill="#65C7F7" stroke="${palette.blueDark}" stroke-width="7"/>`);
  if (kind === "sand") return svg(`<path d="M52 182c34-38 118-44 160 0z" fill="#E9C46A" stroke="${palette.line}" stroke-width="8"/><circle cx="100" cy="154" r="6" fill="#B98420"/><circle cx="146" cy="144" r="5" fill="#B98420"/><circle cx="168" cy="164" r="7" fill="#B98420"/>`);
  if (kind === "bucket") return svg(`<path d="M72 88h112l-14 112H86z" fill="#65C7F7" stroke="${palette.blueDark}" stroke-width="8"/><path d="M92 88c0-30 72-30 72 0" fill="none" ${stroke("#7B8794", 8)}/><path d="M98 132h60" stroke="#DDF6FF" stroke-width="9" stroke-linecap="round"/>`);
  if (kind === "shovel") return svg(`<path d="M74 62c0-20 32-20 32 0v22H74z" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="8"/><path d="M90 84l70 96" ${stroke("#7B8794", 12)}/><path d="M154 176c24 10 38 26 38 46-28 6-56-6-70-30z" fill="#FFD166" stroke="${palette.line}" stroke-width="8"/>`);
  if (kind === "kite") return svg(`<path d="M128 44l62 70-62 70-62-70z" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="8"/><path d="M128 44v140M66 114h124" ${stroke("#FFFFFF", 7)}/><path d="M128 184c12 24-26 30-10 54" fill="none" ${stroke("#7B8794", 7)}/>`);
  if (kind === "ticket") return ticket();
  return null;
}

function ticket() {
  return svg(`<path d="M54 88h148v34c-18 0-18 30 0 30v34H54v-34c18 0 18-30 0-30z" fill="#FFD166" stroke="${palette.line}" stroke-width="8"/><path d="M100 100v72" stroke="#B98420" stroke-width="7" stroke-dasharray="8 8"/><circle cx="150" cy="136" r="16" fill="#F45D5D"/>`);
}

function mapIcon() {
  return svg(`<path d="M46 62l52-18 60 22 52-18v146l-52 18-60-22-52 18z" fill="#F4E4BA" stroke="${palette.line}" stroke-width="8"/><path d="M98 44v146M158 66v146" stroke="#D1A95F" stroke-width="6"/><path d="M70 100c30-18 48 18 76 0s34-8 46 6" fill="none" stroke="${palette.blueDark}" stroke-width="8" stroke-linecap="round"/>`);
}

function generic(slug) {
  return svg(`<rect x="62" y="62" width="132" height="132" rx="30" fill="#FFD166" stroke="${palette.line}" stroke-width="8"/><circle cx="104" cy="104" r="14" fill="#FFFFFF" opacity=".65"/><path d="M92 150h72" ${stroke("#B98420", 10)}/>`);
}

function iconFor(slug) {
  if (slug === "apple") return apple();
  if (slug === "banana") return banana();
  if (slug === "orange") return orange();
  if (slug === "bread") return bread();
  if (slug === "milk") return milk();
  if (slug === "water") return water();
  if (slug === "egg") return egg();
  if (slug === "cup") return cup();
  if (slug === "bowl") return bowl();
  if (slug === "plate") return plate();
  if (slug === "spoon") return spoon();
  if (slug === "fork") return fork();
  if (slug === "rice") return rice();
  if (slug === "soup") return soup();
  if (slug === "sofa") return sofa();
  if (slug === "tv") return tv();
  if (slug === "table" || slug === "desk" || slug === "bench") return table();
  if (slug === "chair" || slug === "seat") return chair();
  if (slug === "lamp") return lamp();
  if (slug === "book") return book();
  if (slug === "toy" || slug === "teddy-bear") return toy();
  if (slug === "ball") return ball();
  if (slug === "box") return box();
  if (slug === "clock") return clock();
  if (slug === "window") return windowIcon();
  if (slug === "door" || slug === "gate" || slug === "entrance" || slug === "exit") return door();
  if (slug === "bed") return bed();
  if (slug === "pillow" || slug === "blanket") return pillow();
  if (["pajamas", "shirt", "pants", "socks", "shoes"].includes(slug)) return clothing(slug);
  if (slug === "mirror") return mirror();
  if (slug === "bag") return bag();
  if (slug === "sleep" || slug === "nap") return sleep();
  if (slug === "teacher") return person("teacher");
  if (slug === "friend" || slug === "driver") return person("child");
  if (slug === "pencil") return pencil();
  if (slug === "crayon") return crayon();
  if (slug === "paper") return paper();
  if (slug === "blocks") return blocks();
  if (slug === "music") return music();
  if (["lion","tiger","monkey","panda","elephant","giraffe","zebra","bear","rabbit","bird","duck","fish","snake","dog","cat","horse","butterfly","insect","spider","turtle","whale","shark"].includes(slug)) return animal(slug);
  if (["car","bus","taxi","bike","scooter","train","subway","plane","boat","ship","truck","fire-truck","ambulance","rocket","fighter-jet","bomber","missile"].includes(slug)) return vehicle(slug);
  if (["stop","go","left","right","up","down","push","pull","no"].includes(slug)) return sign(slug);
  if (["station","bus-stop","toilet","stairs","elevator","road","line"].includes(slug)) return sign(slug);
  if (slug === "ticket" || slug === "card") return ticket();
  if (slug === "map") return mapIcon();
  if (["tank","gun","cannon","sea-mine","helmet","sword"].includes(slug)) return museum(slug);
  if (["dinosaur","bone","fossil","rock","shell","volcano","mountain"].includes(slug)) return nature(slug);
  if (["toilet","sink","soap","towel","bath","shower","toothbrush","toothpaste","comb","clean"].includes(slug)) return bathroom(slug);
  if (["slide","swing","seesaw","sand","bucket","shovel","kite"].includes(slug)) return playground(slug);
  if (slug === "lake") return svg(`<path d="M40 164c34-30 62 16 94-6s54-10 82 8c-28 42-142 42-176-2z" fill="${palette.blue}" stroke="${palette.blueDark}" stroke-width="8"/><path d="M70 154c18-12 42 8 62-6" fill="none" stroke="#DDF6FF" stroke-width="8" stroke-linecap="round"/>`);
  if (slug === "bridge") return svg(`<path d="M44 170c26-58 142-58 168 0" fill="none" stroke="${palette.line}" stroke-width="16"/><path d="M58 170h140M78 146v50M128 128v68M178 146v50" ${stroke(palette.line, 8)}/><path d="M34 204h188" ${stroke(palette.blueDark, 10)}/>`);
  if (slug === "tree") return svg(`<circle cx="128" cy="92" r="48" fill="${palette.green}" stroke="${palette.greenDark}" stroke-width="8"/><circle cx="92" cy="122" r="42" fill="${palette.green}" stroke="${palette.greenDark}" stroke-width="8"/><circle cx="164" cy="122" r="42" fill="${palette.green}" stroke="${palette.greenDark}" stroke-width="8"/><path d="M128 142v66" ${stroke(palette.brownDark, 16)}/>`);
  if (slug === "flower") return svg(`<circle cx="128" cy="112" r="18" fill="#FFD166"/><g fill="#FF8FAB" stroke="#9B3A5A" stroke-width="6"><ellipse cx="128" cy="72" rx="20" ry="30"/><ellipse cx="128" cy="152" rx="20" ry="30"/><ellipse cx="88" cy="112" rx="30" ry="20"/><ellipse cx="168" cy="112" rx="30" ry="20"/></g><path d="M128 160v56M128 184c-26-12-40-4-54 16" ${stroke(palette.greenDark, 9)}/>`);
  if (slug === "grass" || slug === "leaf") return svg(`<path d="M54 196c20-62 48-84 74-42 24-50 58-64 80 42z" fill="${palette.green}" stroke="${palette.greenDark}" stroke-width="8"/><path d="M86 178l24-46M140 174l30-54" ${stroke("#B7E08A", 7)}/>`);
  if (slug === "sun") return svg(`<circle cx="128" cy="128" r="50" fill="#FFD166" stroke="#B98420" stroke-width="8"/><g stroke="#B98420" stroke-width="10" stroke-linecap="round"><path d="M128 38v28M128 190v28M38 128h28M190 128h28M64 64l20 20M172 172l20 20M192 64l-20 20M84 172l-20 20"/></g>`);
  if (slug === "cloud") return svg(`<path d="M76 166c-24 0-42-18-42-40s18-40 42-40c10-28 36-46 68-38 28 7 47 31 47 60 18 4 31 18 31 36 0 22-18 40-40 40H76z" fill="#DDF6FF" stroke="${palette.blueDark}" stroke-width="8"/>`);
  if (slug === "rain") return svg(`${iconFor("cloud").replace(/^<svg[^>]*>|<\/svg>\\n$/g, "")}<path d="M92 176l-18 30M130 176l-18 30M168 176l-18 30" ${stroke(palette.blue, 9)}/>`);
  if (slug === "picnic") return svg(`<rect x="58" y="108" width="140" height="90" rx="18" fill="#F45D5D" stroke="${palette.redDark}" stroke-width="8"/><path d="M58 138h140M88 108v90M128 108v90M168 108v90" stroke="#FFFFFF" stroke-width="7" opacity=".9"/><path d="M84 108c0-28 88-28 88 0" fill="none" ${stroke(palette.brownDark, 10)}/>`);
  return generic(slug);
}

async function main() {
  const source = await readFile(appFile, "utf8");
  const scenes = readScenes(source);
  await mkdir(outDir, { recursive: true });

  const seen = new Set();
  for (const scene of scenes) {
    for (const item of scene.words) {
      const slug = slugify(item.word);
      item.image = `./assets/words/sticker/${slug}.svg`;
      if (seen.has(slug)) continue;
      seen.add(slug);
      await writeFile(join(outDir, `${slug}.svg`), iconFor(slug));
    }
  }

  await writeFile(appFile, writeScenes(source, scenes));
  console.log(`Generated ${seen.size} sticker SVGs.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
