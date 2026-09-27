import { useHotkey } from "@tanstack/react-hotkeys";
import { toBlob } from "html-to-image";
import { useQueryStates } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "./components/canvas";
import { CommandPalette } from "./components/command-palette";
import { EditorTabBar } from "./components/editor-tabs";
import type { ExportFormat } from "./components/format-picker";
import {
	FONT_FAMILIES,
	type FontFamilyId,
	Inspector,
} from "./components/inspector";
import { RADIUS_MAX, RADIUS_MIN } from "./components/radius-control";
import { StatusBar } from "./components/status-bar";
import { useToast } from "./components/toast-provider";
import { type ResolvedMode, useChromeTheme } from "./lib/chrome-theme";
import { buildCommands } from "./lib/commands";
import { captureDataUrl, exportFilter } from "./lib/export";
import {
	buildFoldView,
	computeFoldRanges,
	foldTargetAt,
	fullLineAtDisplayOffset,
} from "./lib/folding";
import {
	framesColorsEqual,
	loadCustomTheme,
	normalizeThemeName,
	requireThemeFrameColors,
	THEME_FRAME_COLORS,
	themeFrameColors,
} from "./lib/highlighter";
import { randomSnippet } from "./lib/snippets";
import {
	type BackgroundPattern,
	type CornerRadii,
	type EditorDocument,
	type HighlightType,
	MAX_DOCUMENTS,
} from "./lib/types";
import { settingsParsers } from "./lib/url-state";

function App() {
	const { resolvedMode } = useChromeTheme();
	const [documents, setDocuments] = useState<EditorDocument[]>(() => {
		const snippet = randomSnippet();
		return [
			{
				id: crypto.randomUUID(),
				fileName: snippet.fileName,
				code: snippet.code,
				language: snippet.language,
				highlightedLines: [],
				highlightedWords: [],
				foldedLines: [],
			},
		];
	});
	const [activeId, setActiveId] = useState(() => documents[0].id);
	const [format, setFormat] = useState<ExportFormat>("png");
	const [exporting, setExporting] = useState(false);
	const [showBoundingBox, setShowBoundingBox] = useState(true);
	const [themeIsRandom, setThemeIsRandom] = useState(false);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [inspectorOpen, setInspectorOpen] = useState(false);
	const [settings, setSettings] = useQueryStates(settingsParsers, {
		history: "replace",
	});
	const frameRef = useRef<HTMLDivElement>(null);
	const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
	const toast = useToast();

	const active = documents.find((doc) => doc.id === activeId) ?? documents[0];

	const themeName = normalizeThemeName(settings.theme);

	// The frame's light/dark preference resolves independently of the app:
	// "auto" follows the app scheme, light/dark force the code block.
	const frameMode = settings.frameMode;
	const resolvedFrameMode: ResolvedMode =
		frameMode === "auto" ? resolvedMode : frameMode;

	// The frame follows the app scheme for adaptive themes. While the user
	// hasn't customized the frame colors (they still match the theme's
	// defaults for the other scheme), swap to the current scheme's defaults
	// when the mode flips. Custom themes and hand-tuned colors are left
	// untouched.
	const prevModeRef = useRef(resolvedFrameMode);
	useEffect(() => {
		const modeChanged = prevModeRef.current !== resolvedFrameMode;
		prevModeRef.current = resolvedFrameMode;

		const legacyTheme = normalizeThemeName(settings.theme) !== settings.theme;
		if (legacyTheme) {
			setSettings({ theme: normalizeThemeName(settings.theme) });
		}
		if (!modeChanged) return;

		const nextColors = themeFrameColors(settings.theme, resolvedFrameMode);
		const otherColors = themeFrameColors(
			settings.theme,
			resolvedFrameMode === "light" ? "dark" : "light",
		);
		if (
			nextColors &&
			otherColors &&
			framesColorsEqual(settings.colors, otherColors) &&
			!framesColorsEqual(settings.colors, nextColors)
		) {
			setSettings({ colors: nextColors });
		}
	}, [resolvedFrameMode, settings.theme, settings.colors, setSettings]);

	const radii: CornerRadii = {
		tl: settings.rtl,
		tr: settings.rtr,
		bl: settings.rbl,
		br: settings.rbr,
	};

	function setRadii(next: CornerRadii) {
		setSettings({ rtl: next.tl, rtr: next.tr, rbl: next.bl, rbr: next.br });
	}

	function updateActive(patch: Partial<EditorDocument>) {
		setDocuments((docs) =>
			docs.map((doc) => (doc.id === activeId ? { ...doc, ...patch } : doc)),
		);
	}

	const HIGHLIGHT_CYCLE: HighlightType[] = ["mark", "add", "remove"];

	function nextHighlightType(current: HighlightType | undefined) {
		if (current === undefined) return "mark" as const;
		const index = HIGHLIGHT_CYCLE.indexOf(current);
		return index === HIGHLIGHT_CYCLE.length - 1
			? null
			: HIGHLIGHT_CYCLE[index + 1];
	}

	// A plain click (no drag) on a single line cycles its type instead of a
	// binary toggle, so mark/add/remove are all reachable from one gesture.
	function cycleLineHighlight(line: number) {
		const current = active.highlightedLines;
		const existing = current.find((l) => l.line === line);
		const next = nextHighlightType(existing?.type);
		const withoutLine = current.filter((l) => l.line !== line);
		updateActive({
			highlightedLines: next
				? [...withoutLine, { line, type: next }]
				: withoutLine,
		});
	}

	// Dragging across multiple lines sets the whole range to "mark" in one
	// gesture; dragging back over an already-all-marked range clears it.
	function setLineRangeHighlight(startLine: number, endLine: number) {
		const from = Math.min(startLine, endLine);
		const to = Math.max(startLine, endLine);
		const current = active.highlightedLines;
		const rangeLines: number[] = [];
		for (let line = from; line <= to; line++) rangeLines.push(line);
		const allAlreadyMarked = rangeLines.every((line) =>
			current.some((l) => l.line === line && l.type === "mark"),
		);
		const withoutRange = current.filter((l) => l.line < from || l.line > to);
		updateActive({
			highlightedLines: allAlreadyMarked
				? withoutRange
				: [
						...withoutRange,
						...rangeLines.map((line) => ({ line, type: "mark" as const })),
					],
		});
	}

	// A plain click (no drag) cycles whatever range sits exactly under the
	// cursor - an existing highlight if there is one, otherwise the whole
	// word - through mark -> add -> remove -> off.
	function cycleWordHighlight(line: number, startCol: number, endCol: number) {
		const current = active.highlightedWords;
		const existing = current.find(
			(w) => w.line === line && w.startCol === startCol && w.endCol === endCol,
		);
		const next = nextHighlightType(existing?.type);
		const withoutWord = current.filter(
			(w) =>
				!(w.line === line && w.startCol === startCol && w.endCol === endCol),
		);
		updateActive({
			highlightedWords: next
				? [...withoutWord, { line, startCol, endCol, type: next }]
				: withoutWord,
		});
	}

	// Dragging across text - possibly spanning multiple lines - marks the
	// exact selected range with character precision instead of snapping to
	// whole tokens; dragging back over an already-all-marked selection
	// clears it, mirroring the line-range gesture.
	function setWordRangeHighlight(
		ranges: { line: number; startCol: number; endCol: number }[],
	) {
		if (ranges.length === 0) return;
		const current = active.highlightedWords;
		const allAlreadyMarked = ranges.every((r) =>
			current.some(
				(w) =>
					w.line === r.line &&
					w.startCol === r.startCol &&
					w.endCol === r.endCol &&
					w.type === "mark",
			),
		);
		const overlaps = (w: { line: number; startCol: number; endCol: number }) =>
			ranges.some(
				(r) =>
					r.line === w.line && r.startCol < w.endCol && r.endCol > w.startCol,
			);
		const withoutOverlaps = current.filter((w) => !overlaps(w));
		updateActive({
			highlightedWords: allAlreadyMarked
				? withoutOverlaps
				: [
						...withoutOverlaps,
						...ranges.map((r) => ({ ...r, type: "mark" as const })),
					],
		});
	}

	// The textarea only holds unfolded lines, so its caret has to be mapped
	// back to a line of the full source.
	function currentLine(): number | null {
		const textarea = codeTextareaRef.current;
		if (!textarea) return null;
		const view = buildFoldView(active.code, active.foldedLines);
		return fullLineAtDisplayOffset(view, textarea.selectionStart);
	}

	function highlightCurrentLine() {
		const line = currentLine();
		if (line !== null) cycleLineHighlight(line);
	}

	function foldCurrentRegion() {
		const line = currentLine();
		if (line === null) return;
		const view = buildFoldView(active.code, active.foldedLines);
		const target = foldTargetAt(view, active.foldedLines, line);
		if (target === null) return;
		updateActive({
			foldedLines: [...active.foldedLines, target].sort((a, b) => a - b),
		});
	}

	function unfoldCurrentRegion() {
		const line = currentLine();
		if (line === null) return;
		updateActive({
			foldedLines: active.foldedLines.filter((l) => l !== line),
		});
	}

	function foldAll() {
		const ranges = computeFoldRanges(active.code.split("\n"));
		updateActive({ foldedLines: [...ranges.keys()].sort((a, b) => a - b) });
	}

	function unfoldAll() {
		updateActive({ foldedLines: [] });
	}

	function clearHighlights() {
		updateActive({ highlightedLines: [], highlightedWords: [] });
	}

	function addDocument() {
		if (documents.length >= MAX_DOCUMENTS) {
			toast.add({
				title: "Snippet limit reached",
				description: `You can have up to ${MAX_DOCUMENTS} snippets.`,
				type: "error",
			});
			return;
		}
		const snippet = randomSnippet();
		const doc: EditorDocument = {
			id: crypto.randomUUID(),
			fileName: snippet.fileName,
			code: snippet.code,
			language: snippet.language,
			highlightedLines: [],
			highlightedWords: [],
			foldedLines: [],
		};
		setDocuments((docs) =>
			docs.length >= MAX_DOCUMENTS ? docs : [...docs, doc],
		);
		setActiveId(doc.id);
	}

	function closeDocument(id: string) {
		if (documents.length <= 1) return;
		const index = documents.findIndex((doc) => doc.id === id);
		const remaining = documents.filter((doc) => doc.id !== id);
		setDocuments(remaining);
		if (id === activeId) {
			setActiveId(remaining[Math.min(index, remaining.length - 1)].id);
		}
	}

	function selectDocument(id: string) {
		setActiveId(id);
	}

	async function handleUploadTheme(file: File) {
		try {
			const result = await loadCustomTheme(await file.text());
			setSettings({ theme: result.name, colors: result.frameColors });
			setThemeIsRandom(false);
			toast.add({
				title: "Theme loaded",
				description: result.name,
				type: "success",
			});
		} catch (_error) {
			toast.add({
				title: "Invalid theme",
				description:
					"Could not parse the uploaded file as a VS Code color theme.",
				type: "error",
			});
		}
	}

	function handleThemeChange(name: string) {
		const colors = themeFrameColors(name, resolvedFrameMode);
		setSettings({ theme: name, ...(colors ? { colors } : {}) });
	}

	function handleManualThemeChange(name: string) {
		handleThemeChange(name);
		setThemeIsRandom(false);
	}

	function randomizeAll() {
		const randomBool = () => Math.random() < 0.5;
		const fontFamilyIds = Object.keys(FONT_FAMILIES) as FontFamilyId[];
		const patterns: BackgroundPattern[] = ["stripes-right", "stripes-left"];
		const radius =
			RADIUS_MIN + Math.floor(Math.random() * (RADIUS_MAX - RADIUS_MIN + 1));

		// Colors are randomized by picking among the curated themes rather
		// than generating independent random hex values per token - arbitrary
		// colors have no contrast or taste guarantees, real themes do.
		const themeNames = Object.keys(THEME_FRAME_COLORS);
		const themePool = themeNames.filter((name) => name !== themeName);
		const pool = themePool.length > 0 ? themePool : themeNames;
		const nextTheme = pool[Math.floor(Math.random() * pool.length)];

		setSettings({
			tabBar: randomBool(),
			gridLines: randomBool(),
			bgPattern: randomBool(),
			pattern: patterns[Math.floor(Math.random() * patterns.length)],
			rtl: radius,
			rtr: radius,
			rbl: radius,
			rbr: radius,
			font: fontFamilyIds[Math.floor(Math.random() * fontFamilyIds.length)],
			theme: nextTheme,
			colors: requireThemeFrameColors(nextTheme, resolvedFrameMode),
		});
		setThemeIsRandom(true);
	}

	async function handleExport() {
		if (!frameRef.current || exporting) return;
		setExporting(true);
		try {
			const dataUrl = await captureDataUrl(frameRef.current, format);
			const link = document.createElement("a");
			link.download = `${active.fileName || "snippets.renildo.dev"}.${format}`;
			link.href = dataUrl;
			link.click();
			toast.add({
				title: "Exported",
				description: `Downloaded as ${format.toUpperCase()}`,
				type: "success",
			});
		} finally {
			setExporting(false);
		}
	}

	async function handleCopyImage() {
		if (!frameRef.current) return;
		const blob = await toBlob(frameRef.current, {
			pixelRatio: 2,
			filter: exportFilter,
		});
		if (!blob) return;
		await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
		toast.add({
			title: "Copied",
			description: "Image copied to clipboard",
			type: "success",
		});
	}

	async function handleShare() {
		await navigator.clipboard.writeText(window.location.href);
		toast.add({
			title: "Link copied",
			description: "Anyone with this link sees the same settings",
			type: "success",
		});
	}

	useHotkey("Mod+K", (event) => {
		event.preventDefault();
		setPaletteOpen((open) => !open);
	});
	useHotkey("Mod+S", (event) => {
		event.preventDefault();
		handleExport();
	});
	useHotkey("Mod+Shift+C", (event) => {
		event.preventDefault();
		handleCopyImage();
	});
	useHotkey("Mod+B", (event) => {
		event.preventDefault();
		setSettings((current) => ({ bgPattern: !current.bgPattern }));
	});
	useHotkey("Mod+Shift+R", (event) => {
		event.preventDefault();
		randomizeAll();
	});
	useHotkey("Mod+Alt+[", (event) => {
		event.preventDefault();
		foldCurrentRegion();
	});
	useHotkey("Mod+Alt+]", (event) => {
		event.preventDefault();
		unfoldCurrentRegion();
	});

	const commands = buildCommands({
		showTabBar: settings.tabBar,
		onShowTabBarChange: (value) => setSettings({ tabBar: value }),
		showStatusBar: settings.statusBar,
		onShowStatusBarChange: (value) => setSettings({ statusBar: value }),
		showBackgroundPattern: settings.bgPattern,
		onShowBackgroundPatternChange: (value) => setSettings({ bgPattern: value }),
		showGridLines: settings.gridLines,
		onShowGridLinesChange: (value) => setSettings({ gridLines: value }),
		onBackgroundChange: (value) => setSettings({ pattern: value }),
		onAspectRatioChange: (value) => setSettings({ ratio: value }),
		onSetLanguage: (value) => updateActive({ language: value }),
		onSetFormat: setFormat,
		onSetFontFamily: (value) => setSettings({ font: value }),
		onCopyCode: () => {
			navigator.clipboard.writeText(active.code);
			toast.add({
				title: "Copied",
				description: "Code copied to clipboard",
				type: "success",
			});
		},
		onExport: handleExport,
		onCopyImage: handleCopyImage,
		onNewDocument: addDocument,
		onCloseDocument: () => closeDocument(activeId),
		onRandomizeAll: randomizeAll,
		onClearHighlights: clearHighlights,
		onHighlightCurrentLine: highlightCurrentLine,
		onFoldCurrentRegion: foldCurrentRegion,
		onUnfoldCurrentRegion: unfoldCurrentRegion,
		onFoldAll: foldAll,
		onUnfoldAll: unfoldAll,
	});

	return (
		<div className="app-root d-f fd-c h-vh o-h bg-page">
			<EditorTabBar
				documents={documents}
				activeId={activeId}
				onSelect={selectDocument}
				onClose={closeDocument}
				onAdd={addDocument}
				onOpenPalette={() => setPaletteOpen(true)}
				onCopy={handleCopyImage}
				onExport={handleExport}
				onShare={handleShare}
				exporting={exporting}
				format={format}
				onFormatChange={setFormat}
			/>

			<div className="f-1 d-f min-h-0">
				<Canvas
					code={active.code}
					onCodeChange={(value) => updateActive({ code: value })}
					foldedLines={active.foldedLines}
					onFoldedLinesChange={(value) => updateActive({ foldedLines: value })}
					language={active.language}
					fileName={active.fileName}
					onFileNameChange={(value) => updateActive({ fileName: value })}
					highlightedLines={active.highlightedLines}
					highlightedWords={active.highlightedWords}
					onCycleLineHighlight={cycleLineHighlight}
					onSetLineRangeHighlight={setLineRangeHighlight}
					onCycleWordHighlight={cycleWordHighlight}
					onSetWordRangeHighlight={setWordRangeHighlight}
					textareaRef={codeTextareaRef}
					showTabBar={settings.tabBar}
					showStatusBar={settings.statusBar}
					showGridLines={settings.gridLines}
					showBackgroundPattern={settings.bgPattern}
					background={settings.pattern}
					aspectRatio={settings.ratio}
					radii={radii}
					fontFamily={FONT_FAMILIES[settings.font].stack}
					themeName={themeName}
					colors={settings.colors}
					showBoundingBox={showBoundingBox}
					frameRef={frameRef}
					mode={resolvedFrameMode}
				/>

				<Inspector
					open={inspectorOpen}
					onOpenChange={setInspectorOpen}
					language={active.language}
					onLanguageChange={(value) => updateActive({ language: value })}
					onRandomize={randomizeAll}
					showTabBar={settings.tabBar}
					onShowTabBarChange={(value) => setSettings({ tabBar: value })}
					showStatusBar={settings.statusBar}
					onShowStatusBarChange={(value) => setSettings({ statusBar: value })}
					showGridLines={settings.gridLines}
					onShowGridLinesChange={(value) => setSettings({ gridLines: value })}
					showBackgroundPattern={settings.bgPattern}
					onShowBackgroundPatternChange={(value) =>
						setSettings({ bgPattern: value })
					}
					showBoundingBox={showBoundingBox}
					onShowBoundingBoxChange={setShowBoundingBox}
					background={settings.pattern}
					onBackgroundChange={(value) => setSettings({ pattern: value })}
					aspectRatio={settings.ratio}
					onAspectRatioChange={(value) => setSettings({ ratio: value })}
					radii={radii}
					onRadiiChange={setRadii}
					fontFamily={settings.font}
					onFontFamilyChange={(value) => setSettings({ font: value })}
					themeName={themeName}
					onThemeChange={handleManualThemeChange}
					themeIsRandom={themeIsRandom}
					frameMode={frameMode}
					onFrameModeChange={(value) => setSettings({ frameMode: value })}
					frameColors={settings.colors}
					onFrameColorsChange={(value) => setSettings({ colors: value })}
					onUploadTheme={handleUploadTheme}
				/>
			</div>

			<StatusBar
				language={active.language}
				onLanguageChange={(value) => updateActive({ language: value })}
				background={settings.pattern}
				onBackgroundChange={(value) => setSettings({ pattern: value })}
				onRandomize={randomizeAll}
			/>

			<CommandPalette
				open={paletteOpen}
				onOpenChange={setPaletteOpen}
				commands={commands}
			/>
		</div>
	);
}

export default App;
