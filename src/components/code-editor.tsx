import { useCallback, useEffect, useRef, useState } from "react";
import type { ResolvedMode } from "../lib/chrome-theme";
import { contrastColor, overlayColor } from "../lib/color";
import {
	getHighlighter,
	type LanguageId,
	resolveShikiTheme,
} from "../lib/highlighter";
import type {
	HighlightedLine,
	HighlightedWord,
	HighlightType,
} from "../lib/types";

const TAB = "\t";

export interface HighlightColors {
	mark: string;
	add: string;
	remove: string;
}

interface WordRange {
	line: number;
	startCol: number;
	endCol: number;
}

interface Segment {
	content: string;
	color?: string;
	type?: HighlightType;
	isPreview?: boolean;
	startCol: number;
	endCol: number;
}

function lineElementAt(
	clientX: number,
	clientY: number,
): HTMLElement | undefined {
	return document
		.elementsFromPoint(clientX, clientY)
		.find(
			(el): el is HTMLElement =>
				el instanceof HTMLElement && el.dataset.lineIndex !== undefined,
		);
}

function segmentElementAt(
	clientX: number,
	clientY: number,
): HTMLElement | undefined {
	return document
		.elementsFromPoint(clientX, clientY)
		.find(
			(el): el is HTMLElement =>
				el instanceof HTMLElement && el.dataset.colStart !== undefined,
		);
}

interface DocPosition {
	line: number;
	col: number;
}

// Resolves a screen point directly against the rendered Shiki spans (the
// text the user actually sees) rather than the invisible textarea sitting
// on top of them. The textarea has its own, separately-laid-out copy of
// the same text purely so native caret/selection/typing works, and its
// line-wrapping can drift a pixel or two from the visible spans - which is
// enough for its own selectionStart/selectionEnd to land on the wrong
// line. Hit-testing the visible DOM directly instead means what the user
// drags over is always exactly what gets highlighted.
function resolveCaretPosition(
	clientX: number,
	clientY: number,
): DocPosition | null {
	const doc = document as Document & {
		caretRangeFromPoint?: (x: number, y: number) => Range | null;
		caretPositionFromPoint?: (
			x: number,
			y: number,
		) => { offsetNode: Node; offset: number } | null;
	};
	let node: Node | null = null;
	let offset = 0;
	if (doc.caretRangeFromPoint) {
		const range = doc.caretRangeFromPoint(clientX, clientY);
		if (!range) return null;
		node = range.startContainer;
		offset = range.startOffset;
	} else if (doc.caretPositionFromPoint) {
		const pos = doc.caretPositionFromPoint(clientX, clientY);
		if (!pos) return null;
		node = pos.offsetNode;
		offset = pos.offset;
	} else {
		return null;
	}
	const el = node instanceof Element ? node : node.parentElement;
	const lineEl = el?.closest<HTMLElement>("[data-line-index]");
	if (!lineEl) return null;
	const line = Number(lineEl.dataset.lineIndex);
	const segmentEl = el?.closest<HTMLElement>("[data-col-start]");
	if (!segmentEl) return { line, col: 0 };
	const base = Number(segmentEl.dataset.colStart);
	const col =
		node instanceof Element
			? base + (offset > 0 ? (segmentEl.textContent?.length ?? 0) : 0)
			: base + offset;
	return { line, col };
}

// Builds the per-line column ranges spanning two document positions,
// normalizing whichever order they were dragged in and clamping each
// touched line to its own length so a drag that crosses a line boundary
// covers exactly the text between the two points, nothing more.
function buildRangesBetween(
	a: DocPosition,
	b: DocPosition,
	lines: string[],
): WordRange[] {
	const [from, to] =
		a.line < b.line || (a.line === b.line && a.col <= b.col) ? [a, b] : [b, a];
	const ranges: WordRange[] = [];
	for (let line = from.line; line <= to.line; line++) {
		const lineLen = lines[line]?.length ?? 0;
		const startCol = line === from.line ? from.col : 0;
		const endCol = line === to.line ? to.col : lineLen;
		if (startCol < endCol) ranges.push({ line, startCol, endCol });
	}
	return ranges;
}

// Splits a line's Shiki tokens into finer segments wherever a highlight
// range (committed or a live drag preview) starts or ends, so highlights
// can land on an arbitrary character range instead of snapping to whole
// tokens. A preview range always wins where it overlaps a committed one,
// so mid-drag the user only ever sees the range they're actively drawing.
function splitLineIntoSegments(
	lineTokens: { content: string; color?: string }[],
	committed: (WordRange & { type: HighlightType })[],
	preview: WordRange | null,
): Segment[] {
	const ranges: {
		startCol: number;
		endCol: number;
		type?: HighlightType;
		isPreview?: boolean;
	}[] = committed
		.filter(
			(r) =>
				!preview ||
				r.endCol <= preview.startCol ||
				r.startCol >= preview.endCol,
		)
		.map((r) => ({ startCol: r.startCol, endCol: r.endCol, type: r.type }));
	if (preview) ranges.push({ ...preview, type: "mark", isPreview: true });
	ranges.sort((a, b) => a.startCol - b.startCol);

	const segments: Segment[] = [];
	let col = 0;
	for (const token of lineTokens) {
		const tokenStart = col;
		const tokenEnd = col + token.content.length;
		let pos = tokenStart;
		while (pos < tokenEnd) {
			const active = ranges.find((r) => pos >= r.startCol && pos < r.endCol);
			const nextBoundary = active
				? Math.min(active.endCol, tokenEnd)
				: Math.min(
						...ranges.map((r) => r.startCol).filter((s) => s > pos),
						tokenEnd,
					);
			segments.push({
				content: token.content.slice(
					pos - tokenStart,
					nextBoundary - tokenStart,
				),
				color: token.color,
				type: active?.type,
				isPreview: active?.isPreview,
				startCol: pos,
				endCol: nextBoundary,
			});
			pos = nextBoundary;
		}
		col = tokenEnd;
	}
	return segments;
}

function CodeLine({
	lineIndex,
	line,
	lineTokens,
	highlightType,
	isPreview,
	highlightedWords,
	wordPreview,
	highlightColors,
}: {
	lineIndex: number;
	line: string;
	lineTokens: { content: string; color?: string }[];
	highlightType: HighlightType | undefined;
	isPreview: boolean;
	highlightedWords: HighlightedWord[];
	wordPreview: WordRange | null;
	highlightColors: HighlightColors;
}) {
	const lineBackground = highlightType
		? overlayColor(highlightColors[highlightType], 0.16)
		: isPreview
			? overlayColor(highlightColors.mark, 0.08)
			: undefined;

	const segments = splitLineIntoSegments(
		lineTokens,
		highlightedWords.filter((w) => w.line === lineIndex),
		wordPreview,
	);

	return (
		<div
			data-line-index={lineIndex}
			className="ws-pw d-b mx--4 px-4"
			style={lineBackground ? { backgroundColor: lineBackground } : undefined}
		>
			{/* Fall back to the plain line while Shiki tokens load, so
			    lines keep their real height from the first paint */}
			{segments.map((segment, segmentIndex) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: index is stable, segments are purely positional within a line
					key={segmentIndex}
					data-col-start={segment.startCol}
					data-col-end={segment.endCol}
					style={{
						color: segment.color,
						...(segment.type
							? {
									backgroundColor: overlayColor(
										highlightColors[segment.type],
										segment.isPreview ? 0.14 : 0.2,
									),
									borderColor: overlayColor(
										highlightColors[segment.type],
										segment.isPreview ? 0.45 : 0.6,
									),
								}
							: {}),
					}}
					className={segment.type ? "bw-1" : ""}
				>
					{segment.content}
				</span>
			))}
			{line.length === 0 && " "}
		</div>
	);
}

export function CodeEditor({
	code,
	onCodeChange,
	language,
	themeName,
	fontFamily,
	background,
	highlightedLines,
	highlightedWords,
	onCycleLineHighlight,
	onSetLineRangeHighlight,
	onCycleWordHighlight,
	onSetWordRangeHighlight,
	textareaRef,
	highlightColors,
	mode,
}: {
	code: string;
	onCodeChange: (value: string) => void;
	language: LanguageId;
	themeName: string;
	fontFamily?: string;
	background: string;
	highlightedLines: HighlightedLine[];
	highlightedWords: HighlightedWord[];
	onCycleLineHighlight: (line: number) => void;
	onSetLineRangeHighlight: (startLine: number, endLine: number) => void;
	onCycleWordHighlight: (
		line: number,
		startCol: number,
		endCol: number,
	) => void;
	onSetWordRangeHighlight: (ranges: WordRange[]) => void;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	highlightColors: HighlightColors;
	mode: ResolvedMode;
}) {
	const [tokens, setTokens] = useState<{ content: string; color?: string }[][]>(
		[],
	);
	const [altHoverLine, setAltHoverLine] = useState<number | null>(null);
	const [dragPreview, setDragPreview] = useState<{
		start: number;
		end: number;
	} | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const dragStartLineRef = useRef<number | null>(null);
	const dragMovedRef = useRef(false);
	const dragPreviewRef = useRef(dragPreview);
	dragPreviewRef.current = dragPreview;

	const [wordDragActive, setWordDragActive] = useState(false);
	const [wordDragCurrent, setWordDragCurrent] = useState<DocPosition | null>(
		null,
	);
	const wordDragStartRef = useRef<DocPosition | null>(null);
	const wordDragMovedRef = useRef(false);
	const wordDragCurrentRef = useRef(wordDragCurrent);
	wordDragCurrentRef.current = wordDragCurrent;

	useEffect(() => {
		let cancelled = false;
		getHighlighter().then((highlighter) => {
			if (cancelled) return;
			const lang = language === "mjs" ? "javascript" : language;
			const result = highlighter.codeToTokens(code, {
				lang,
				theme: resolveShikiTheme(themeName, mode),
			});
			setTokens(result.tokens);
		});
		return () => {
			cancelled = true;
		};
	}, [code, language, themeName, mode]);

	const lines = code.split("\n");
	const editorStyle = {
		tabSize: 2,
		...(fontFamily ? { fontFamily } : {}),
	};
	const caretColor = contrastColor(background);

	const setSelection = useCallback(
		(textarea: HTMLTextAreaElement, start: number, end: number) => {
			// The textarea is controlled, so the value updates on re-render;
			// restore the caret afterwards.
			requestAnimationFrame(() => {
				textarea.selectionStart = start;
				textarea.selectionEnd = end;
			});
		},
		[],
	);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key !== "Tab") return;
			event.preventDefault();
			const textarea = event.currentTarget;
			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			const dedent = event.shiftKey;

			// Plain Tab with no selection: insert a single indent at the caret.
			if (!dedent && start === end) {
				const next = code.slice(0, start) + TAB + code.slice(end);
				onCodeChange(next);
				setSelection(textarea, start + TAB.length, start + TAB.length);
				return;
			}

			// Otherwise indent/dedent every line the selection touches.
			const firstLineStart = code.lastIndexOf("\n", start - 1) + 1;
			const nextBreak = code.indexOf("\n", end);
			const regionEnd = nextBreak === -1 ? code.length : nextBreak;
			const regionLines = code.slice(firstLineStart, regionEnd).split("\n");

			let firstDelta = 0;
			let totalDelta = 0;
			const transformed = regionLines.map((line, index) => {
				if (dedent) {
					const cut = line.startsWith(TAB)
						? 1
						: (line.match(/^ {1,2}/)?.[0].length ?? 0);
					if (index === 0) firstDelta = -cut;
					totalDelta -= cut;
					return line.slice(cut);
				}
				if (index === 0) firstDelta = TAB.length;
				totalDelta += TAB.length;
				return TAB + line;
			});

			const next =
				code.slice(0, firstLineStart) +
				transformed.join("\n") +
				code.slice(regionEnd);
			onCodeChange(next);
			setSelection(
				textarea,
				Math.max(firstLineStart, start + firstDelta),
				end + totalDelta,
			);
		},
		[code, onCodeChange, setSelection],
	);

	const finishDrag = useCallback(() => {
		const startLine = dragStartLineRef.current;
		const preview = dragPreviewRef.current;
		if (startLine !== null) {
			if (dragMovedRef.current && preview) {
				onSetLineRangeHighlight(
					Math.min(preview.start, preview.end),
					Math.max(preview.start, preview.end),
				);
			} else {
				onCycleLineHighlight(startLine);
			}
		}
		dragStartLineRef.current = null;
		dragMovedRef.current = false;
		setDragPreview(null);
		setDragActive(false);
	}, [onCycleLineHighlight, onSetLineRangeHighlight]);

	// Alt+drag across lines previews and commits a whole range at once (all
	// set to "mark", or cleared if the range is already uniformly marked).
	// A plain Alt+click (no movement) instead cycles that single line through
	// mark -> add -> remove -> off. Tracked with window-level listeners so the
	// drag keeps working even if the cursor leaves the textarea mid-gesture.
	useEffect(() => {
		if (!dragActive) return;
		const handleWindowMouseMove = (event: MouseEvent) => {
			const lineEl = lineElementAt(event.clientX, event.clientY);
			if (!lineEl) return;
			const line = Number(lineEl.dataset.lineIndex);
			const startLine = dragStartLineRef.current;
			if (startLine === null) return;
			if (line !== startLine) dragMovedRef.current = true;
			setDragPreview({ start: startLine, end: line });
		};
		const handleWindowMouseUp = () => finishDrag();
		window.addEventListener("mousemove", handleWindowMouseMove);
		window.addEventListener("mouseup", handleWindowMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleWindowMouseMove);
			window.removeEventListener("mouseup", handleWindowMouseUp);
		};
	}, [dragActive, finishDrag]);

	// Alt+Shift+drag hit-tests the visible spans directly (via
	// resolveCaretPosition) on every mousemove, so the highlighted range
	// tracks the cursor live instead of only appearing once the mouse is
	// released. A drag that never actually moves falls back to toggling the
	// whole word under the cursor, so a quick click still works.
	useEffect(() => {
		if (!wordDragActive) return;
		const handleWindowMouseMove = (event: MouseEvent) => {
			const pos = resolveCaretPosition(event.clientX, event.clientY);
			if (!pos) return;
			const start = wordDragStartRef.current;
			if (start && (pos.line !== start.line || pos.col !== start.col)) {
				wordDragMovedRef.current = true;
			}
			setWordDragCurrent(pos);
		};
		const handleWindowMouseUp = (event: MouseEvent) => {
			const start = wordDragStartRef.current;
			setWordDragActive(false);
			setWordDragCurrent(null);
			wordDragStartRef.current = null;
			if (!start) return;
			if (!wordDragMovedRef.current) {
				const lineEl = lineElementAt(event.clientX, event.clientY);
				const segmentEl = segmentElementAt(event.clientX, event.clientY);
				if (lineEl && segmentEl) {
					onCycleWordHighlight(
						Number(lineEl.dataset.lineIndex),
						Number(segmentEl.dataset.colStart),
						Number(segmentEl.dataset.colEnd),
					);
				}
				return;
			}
			const current = wordDragCurrentRef.current ?? start;
			onSetWordRangeHighlight(buildRangesBetween(start, current, lines));
		};
		window.addEventListener("mousemove", handleWindowMouseMove);
		window.addEventListener("mouseup", handleWindowMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleWindowMouseMove);
			window.removeEventListener("mouseup", handleWindowMouseUp);
		};
	}, [wordDragActive, lines, onCycleWordHighlight, onSetWordRangeHighlight]);

	const handleMouseMove = useCallback(
		(event: React.MouseEvent<HTMLTextAreaElement>) => {
			if (dragActive || wordDragActive || !event.altKey || event.shiftKey) {
				setAltHoverLine(null);
				return;
			}
			const lineEl = lineElementAt(event.clientX, event.clientY);
			setAltHoverLine(lineEl ? Number(lineEl.dataset.lineIndex) : null);
		},
		[dragActive, wordDragActive],
	);

	const handleMouseLeave = useCallback(() => setAltHoverLine(null), []);

	const handleMouseDown = useCallback(
		(event: React.MouseEvent<HTMLTextAreaElement>) => {
			if (!event.altKey) return;
			event.preventDefault();

			// Alt+Shift: hit-test the visible spans at the cursor to start a
			// character-precise word/range drag (see resolveCaretPosition).
			// The textarea itself is what's under the pointer right now, so
			// resolveCaretPosition would just hit it instead of the spans
			// beneath it - step out of the way first. (The `wordDragActive`
			// style takes over from here for the rest of the gesture.)
			if (event.shiftKey) {
				setAltHoverLine(null);
				const textarea = event.currentTarget;
				textarea.style.pointerEvents = "none";
				const pos = resolveCaretPosition(event.clientX, event.clientY);
				if (!pos) {
					textarea.style.pointerEvents = "";
					return;
				}
				wordDragStartRef.current = pos;
				wordDragMovedRef.current = false;
				setWordDragCurrent(pos);
				setWordDragActive(true);
				return;
			}

			const lineEl = lineElementAt(event.clientX, event.clientY);
			if (!lineEl) return;
			const line = Number(lineEl.dataset.lineIndex);

			setAltHoverLine(null);
			dragStartLineRef.current = line;
			dragMovedRef.current = false;
			setDragPreview({ start: line, end: line });
			setDragActive(true);
		},
		[],
	);

	const wordPreviewRanges =
		wordDragActive &&
		wordDragMovedRef.current &&
		wordDragStartRef.current &&
		wordDragCurrent
			? buildRangesBetween(wordDragStartRef.current, wordDragCurrent, lines)
			: [];

	return (
		<div className="p-r ff-m fs-sm lh-4" style={editorStyle}>
			{lines.map((line, lineIndex) => {
				const committed = highlightedLines.find((h) => h.line === lineIndex);
				const inDragRange =
					dragPreview &&
					lineIndex >= Math.min(dragPreview.start, dragPreview.end) &&
					lineIndex <= Math.max(dragPreview.start, dragPreview.end);
				return (
					<CodeLine
						// biome-ignore lint/suspicious/noArrayIndexKey: index is stable, lines are purely positional
						key={lineIndex}
						lineIndex={lineIndex}
						line={line}
						lineTokens={
							tokens[lineIndex] ?? [{ content: line, color: undefined }]
						}
						highlightType={
							inDragRange && dragMovedRef.current ? "mark" : committed?.type
						}
						isPreview={
							!committed && (inDragRange || altHoverLine === lineIndex)
						}
						highlightedWords={highlightedWords}
						wordPreview={
							wordPreviewRanges.find((r) => r.line === lineIndex) ?? null
						}
						highlightColors={highlightColors}
					/>
				);
			})}
			<textarea
				value={code}
				onChange={(event) => onCodeChange(event.target.value)}
				spellCheck={false}
				autoCapitalize="off"
				autoCorrect="off"
				ref={textareaRef}
				onKeyDown={handleKeyDown}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				onMouseDown={handleMouseDown}
				className="p-a t-0 l-0 w-100% h-100% p-0 m-0 bg-transparent c-transparent bw-0 os-none o-h r-none ff-m fs-sm lh-4 ws-pw"
				style={{
					...editorStyle,
					caretColor,
					pointerEvents: wordDragActive ? "none" : undefined,
				}}
			/>
		</div>
	);
}
