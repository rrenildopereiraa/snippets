import { mkdir, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";

const ACCENT = "#2563eb";
const PAGE = "#ffffff";
const SURFACE = "#f1f5f9";
const BORDER = "#cbd5e1";
const INK = "#0f172a";
const MUTED = "#64748b";

/** Simple "S" monogram for favicon / PWA icons. */
function monogramSvg({ size = 100, background = null } = {}) {
	const bg = background
		? `<rect width="100" height="100" fill="${background}"/>`
		: "";
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${bg}<text x="50" y="68" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="64" fill="${ACCENT}">S</text></svg>`;
}

function faviconSvg() {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none">
	<text x="50" y="68" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="64" fill="${ACCENT}">S</text>
</svg>
`;
}

function ogImageSvg({
	title = "Snippets",
	tagline = "Beautiful code screenshots.",
} = {}) {
	const W = 1200;
	const H = 630;
	const FONT = "JetBrains Mono, Consolas, monospace";

	// Monospace advance width for JetBrains Mono is 0.6em.
	const titleFontSize = 68;
	const titleWidth = title.length * titleFontSize * 0.6;

	const taglineFontSize = 28;
	const taglineWidth = tagline.length * taglineFontSize * 0.6;
	const taglineGap = 28;

	const blockHeight = titleFontSize + taglineGap + taglineFontSize;
	const blockTop = (H - blockHeight) / 2;

	const titleX = (W - titleWidth) / 2;
	const titleBaselineY = blockTop + titleFontSize * 0.85;

	const taglineX = (W - taglineWidth) / 2;
	const taglineBaselineY =
		blockTop + titleFontSize + taglineGap + taglineFontSize * 0.75;

	const accentStart = "Snip".length;
	const titleMarkup = `${title.slice(0, accentStart)}<tspan fill="${ACCENT}">${title.slice(accentStart)}</tspan>`;

	const gridSize = 48;
	let grid = "";
	for (let x = gridSize; x < W; x += gridSize) {
		grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${BORDER}" stroke-width="1" stroke-opacity="0.4"/>`;
	}
	for (let y = gridSize; y < H; y += gridSize) {
		grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${BORDER}" stroke-width="1" stroke-opacity="0.4"/>`;
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
		<rect width="${W}" height="${H}" fill="${SURFACE}"/>
		${grid}
		<rect width="${W}" height="${H}" fill="none" stroke="${BORDER}" stroke-width="2"/>
		<text x="${titleX}" y="${titleBaselineY}" font-family="${FONT}" font-weight="700" font-size="${titleFontSize}" fill="${INK}">${titleMarkup}</text>
		<text x="${taglineX}" y="${taglineBaselineY}" font-family="${FONT}" font-weight="400" font-size="${taglineFontSize}" fill="${MUTED}">${tagline}</text>
	</svg>`;
}

async function main() {
	await rm("public/brand", { recursive: true, force: true });
	await mkdir("public", { recursive: true });

	await writeFile("public/favicon.svg", faviconSvg());

	await sharp(Buffer.from(monogramSvg({ size: 192, background: PAGE })))
		.png()
		.toFile("public/pwa-192.png");

	await sharp(Buffer.from(monogramSvg({ size: 512, background: PAGE })))
		.png()
		.toFile("public/pwa-512.png");

	await sharp(Buffer.from(monogramSvg({ size: 180, background: PAGE })))
		.png()
		.toFile("public/apple-touch-icon.png");

	await sharp(Buffer.from(ogImageSvg())).png().toFile("public/og-image.png");

	console.log(
		"Generated favicon.svg, pwa-192.png, pwa-512.png, apple-touch-icon.png, og-image.png",
	);
}

main();
