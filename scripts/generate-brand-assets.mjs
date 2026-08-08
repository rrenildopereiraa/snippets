import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const MARK_OUTER = "50,18 78,50 50,82 22,50";
const MARK_INNER = "50,18 64,50 50,82";

function markSvg({ size = 100, background = null } = {}) {
	const bg = background
		? `<rect width="100" height="100" fill="${background}"/>`
		: "";
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${bg}<polygon points="${MARK_OUTER}" fill="#2563eb" stroke="#1d4ed8" stroke-width="1"/><polygon points="${MARK_INNER}" fill="#93b4f5"/></svg>`;
}

function ogImageSvg({ tagline = "Beautiful code screenshots." } = {}) {
	const W = 1200;
	const H = 630;
	const FONT = "JetBrains Mono, Consolas, monospace";

	// Monospace advance width for JetBrains Mono is 0.6em.
	const markSize = 140;
	const gap = 28;
	const titleFontSize = 68;
	const wordmarkChars = "Snippets".length;
	const wordmarkWidth = wordmarkChars * titleFontSize * 0.6;
	const lockupWidth = markSize + gap + wordmarkWidth;
	const lockupHeight = markSize;

	const taglineFontSize = 28;
	const taglineWidth = tagline.length * taglineFontSize * 0.6;
	const taglineGap = 44;

	const blockHeight = lockupHeight + taglineGap + taglineFontSize;
	const blockTop = (H - blockHeight) / 2;

	const markX = (W - lockupWidth) / 2;
	const markY = blockTop;
	const wordmarkX = markX + markSize + gap;
	const wordmarkBaselineY = markY + markSize / 2 + titleFontSize * 0.35;

	const taglineX = (W - taglineWidth) / 2;
	const taglineBaselineY =
		blockTop + lockupHeight + taglineGap + taglineFontSize * 0.75;

	const gridSize = 48;
	let grid = "";
	for (let x = gridSize; x < W; x += gridSize) {
		grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#cbd5e1" stroke-width="1" stroke-opacity="0.4"/>`;
	}
	for (let y = gridSize; y < H; y += gridSize) {
		grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#cbd5e1" stroke-width="1" stroke-opacity="0.4"/>`;
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
		<rect width="${W}" height="${H}" fill="#f1f5f9"/>
		${grid}
		<rect width="${W}" height="${H}" fill="none" stroke="#cbd5e1" stroke-width="2"/>
		<g transform="translate(${markX},${markY}) scale(${markSize / 100})">
			<polygon points="${MARK_OUTER}" fill="#2563eb" stroke="#1d4ed8" stroke-width="1"/>
			<polygon points="${MARK_INNER}" fill="#93b4f5"/>
		</g>
		<text x="${wordmarkX}" y="${wordmarkBaselineY}" font-family="${FONT}" font-weight="700" font-size="${titleFontSize}" fill="#0f172a">Pri<tspan fill="#2563eb">sharp</tspan></text>
		<text x="${taglineX}" y="${taglineBaselineY}" font-family="${FONT}" font-weight="400" font-size="${taglineFontSize}" fill="#64748b">${tagline}</text>
	</svg>`;
}

async function main() {
	await mkdir("public/brand", { recursive: true });

	await sharp(Buffer.from(markSvg({ size: 192, background: "#ffffff" })))
		.png()
		.toFile("public/pwa-192.png");

	await sharp(Buffer.from(markSvg({ size: 512, background: "#ffffff" })))
		.png()
		.toFile("public/pwa-512.png");

	await sharp(Buffer.from(markSvg({ size: 180, background: "#ffffff" })))
		.png()
		.toFile("public/apple-touch-icon.png");

	await sharp(Buffer.from(ogImageSvg())).png().toFile("public/og-image.png");

	console.log(
		"Generated pwa-192.png, pwa-512.png, apple-touch-icon.png, og-image.png",
	);
}

main();
