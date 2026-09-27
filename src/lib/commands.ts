import type { ExportFormat } from "../components/format-picker";
import { FONT_FAMILIES, type FontFamilyId } from "../components/inspector";
import { LANGUAGES, type LanguageId } from "./highlighter";
import { modLabel } from "./platform";
import {
	ASPECT_RATIOS,
	type AspectRatio,
	type BackgroundPattern,
} from "./types";

export interface Command {
	id: string;
	label: string;
	kbd?: string;
	run: () => void;
}

export function buildCommands({
	showTabBar,
	onShowTabBarChange,
	showStatusBar,
	onShowStatusBarChange,
	showBackgroundPattern,
	onShowBackgroundPatternChange,
	showGridLines,
	onShowGridLinesChange,
	onBackgroundChange,
	onAspectRatioChange,
	onSetLanguage,
	onSetFormat,
	onSetFontFamily,
	onCopyCode,
	onExport,
	onCopyImage,
	onNewDocument,
	onCloseDocument,
	onRandomizeAll,
	onClearHighlights,
	onHighlightCurrentLine,
	onFoldCurrentRegion,
	onUnfoldCurrentRegion,
	onFoldAll,
	onUnfoldAll,
}: {
	showTabBar: boolean;
	onShowTabBarChange: (value: boolean) => void;
	showStatusBar: boolean;
	onShowStatusBarChange: (value: boolean) => void;
	showBackgroundPattern: boolean;
	onShowBackgroundPatternChange: (value: boolean) => void;
	showGridLines: boolean;
	onShowGridLinesChange: (value: boolean) => void;
	onBackgroundChange: (value: BackgroundPattern) => void;
	onAspectRatioChange: (value: AspectRatio) => void;
	onSetLanguage: (value: LanguageId) => void;
	onSetFormat: (value: ExportFormat) => void;
	onSetFontFamily: (value: FontFamilyId) => void;
	onCopyCode: () => void;
	onExport: () => void;
	onCopyImage: () => void;
	onNewDocument: () => void;
	onCloseDocument: () => void;
	onRandomizeAll: () => void;
	onClearHighlights: () => void;
	onHighlightCurrentLine: () => void;
	onFoldCurrentRegion: () => void;
	onUnfoldCurrentRegion: () => void;
	onFoldAll: () => void;
	onUnfoldAll: () => void;
}): Command[] {
	const BACKGROUND_PATTERNS: Record<BackgroundPattern, string> = {
		"stripes-right": "Stripes Right",
		"stripes-left": "Stripes Left",
	};

	return [
		{
			id: "new-snippet",
			label: "New snippet",
			run: onNewDocument,
		},
		{
			id: "close-snippet",
			label: "Close snippet",
			run: onCloseDocument,
		},
		{
			id: "randomize",
			label: "Randomize appearance",
			kbd: `${modLabel} Shift R`,
			run: onRandomizeAll,
		},
		{
			id: "highlight-current-line",
			label: "Toggle highlight: current line",
			run: onHighlightCurrentLine,
		},
		{
			id: "clear-highlights",
			label: "Clear highlights",
			run: onClearHighlights,
		},
		{
			id: "fold-current-region",
			label: "Fold region at cursor",
			kbd: `${modLabel} Alt [`,
			run: onFoldCurrentRegion,
		},
		{
			id: "unfold-current-region",
			label: "Unfold region at cursor",
			kbd: `${modLabel} Alt ]`,
			run: onUnfoldCurrentRegion,
		},
		{
			id: "fold-all",
			label: "Fold all regions",
			run: onFoldAll,
		},
		{
			id: "unfold-all",
			label: "Unfold all regions",
			run: onUnfoldAll,
		},
		{
			id: "export",
			label: "Export",
			kbd: `${modLabel} S`,
			run: onExport,
		},
		{
			id: "copy-image",
			label: "Copy image to clipboard",
			kbd: `${modLabel} Shift C`,
			run: onCopyImage,
		},
		{
			id: "copy-code",
			label: "Copy code to clipboard",
			run: onCopyCode,
		},
		{
			id: "toggle-tab-bar",
			label: `${showTabBar ? "Hide" : "Show"} tab bar`,
			run: () => onShowTabBarChange(!showTabBar),
		},
		{
			id: "toggle-status-bar",
			label: `${showStatusBar ? "Hide" : "Show"} status bar`,
			run: () => onShowStatusBarChange(!showStatusBar),
		},
		{
			id: "toggle-background-pattern",
			label: `${showBackgroundPattern ? "Hide" : "Show"} background pattern`,
			kbd: `${modLabel} B`,
			run: () => onShowBackgroundPatternChange(!showBackgroundPattern),
		},
		{
			id: "toggle-grid-lines",
			label: `${showGridLines ? "Hide" : "Show"} grid lines`,
			run: () => onShowGridLinesChange(!showGridLines),
		},
		{
			id: "set-background-stripes-right",
			label: `Background: Stripes Right`,
			run: () => onBackgroundChange("stripes-right"),
		},
		{
			id: "set-background-stripes-left",
			label: `Background: Stripes Left`,
			run: () => onBackgroundChange("stripes-left"),
		},
		...(Object.keys(BACKGROUND_PATTERNS) as BackgroundPattern[]).map(
			(id): Command => ({
				id: `background-${id}`,
				label: `Background: ${BACKGROUND_PATTERNS[id]}`,
				run: () => onBackgroundChange(id),
			}),
		),
		...ASPECT_RATIOS.map(
			({ id, label }): Command => ({
				id: `aspect-ratio-${id}`,
				label: `Aspect ratio: ${label}`,
				run: () => onAspectRatioChange(id),
			}),
		),
		...(Object.keys(FONT_FAMILIES) as FontFamilyId[]).map(
			(id): Command => ({
				id: `font-family-${id}`,
				label: `Set font family: ${FONT_FAMILIES[id].label}`,
				run: () => onSetFontFamily(id),
			}),
		),
		...(Object.entries(LANGUAGES) as [LanguageId, string][]).map(
			([id, label]): Command => ({
				id: `language-${id}`,
				label: `Set language: ${label}`,
				run: () => onSetLanguage(id),
			}),
		),
		...(["png", "jpg", "webp", "svg"] as ExportFormat[]).map(
			(id): Command => ({
				id: `format-${id}`,
				label: `Set format: ${id.toUpperCase()}`,
				run: () => onSetFormat(id),
			}),
		),
	];
}
