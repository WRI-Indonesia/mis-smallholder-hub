#!/usr/bin/env node

const sharp = require("sharp");

function makeSvg(fill) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>
    <g filter="url(#shadow)">
      <path d="M32 58c0 0 18-17.2 18-31C50 15.4 41.9 7 32 7S14 15.4 14 27c0 13.8 18 31 18 31z"
            fill="${fill}"
            stroke="white"
            stroke-width="3"
            stroke-linejoin="round"/>
      <circle cx="32" cy="27" r="7.5" fill="white" opacity="0.95"/>
    </g>
  </svg>
  `.trim();
}

async function main() {
  await sharp(Buffer.from(makeSvg("#22c55e"))).png().toFile("public/markers/farmer-group.png");
  await sharp(Buffer.from(makeSvg("#3b82f6"))).png().toFile("public/markers/farmer-group-active.png");
  console.log("✅ Generated marker PNGs in public/markers/");
}

main().catch((e) => {
  console.error("❌ Failed generating marker PNGs:", e);
  process.exitCode = 1;
});
