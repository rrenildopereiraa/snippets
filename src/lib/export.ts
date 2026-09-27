import { toBlob, toCanvas, toJpeg, toPng, toSvg } from "html-to-image";
import type { ExportFormat } from "../components/format-picker";

// Editing affordances inside the frame (e.g. fold chevrons) opt out of
// exports with a `data-export-ignore` attribute.
export function exportFilter(node: HTMLElement): boolean {
	return !(node instanceof Element && node.hasAttribute("data-export-ignore"));
}

export async function captureDataUrl(
	node: HTMLElement,
	format: ExportFormat,
): Promise<string> {
	const filter = exportFilter;
	switch (format) {
		case "svg":
			return toSvg(node, { filter });
		case "webp": {
			const canvas = await toCanvas(node, { pixelRatio: 2, filter });
			return canvas.toDataURL("image/webp");
		}
		case "jpg":
			return toJpeg(node, { pixelRatio: 2, quality: 0.95, filter });
		default:
			return toPng(node, { pixelRatio: 2, filter });
	}
}

export async function copyImageToClipboard(node: HTMLElement) {
	const blob = await toBlob(node, { pixelRatio: 2, filter: exportFilter });
	if (!blob) return;
	await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
