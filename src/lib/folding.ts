// Indentation-based code folding, the same model VS Code falls back to:
// a line is foldable when the next non-blank line is indented deeper, and
// its region covers every following line indented deeper than it. Closing
// brackets sit at the header's own indentation, so they stay visible and a
// folded block reads as `function a() {⋯` followed by `}`.

const TAB_SIZE = 2;

function indentWidth(line: string): number | null {
	let width = 0;
	for (const char of line) {
		if (char === " ") width++;
		else if (char === "\t") width += TAB_SIZE - (width % TAB_SIZE);
		else return width;
	}
	return null;
}

// Header line -> last hidden line (inclusive) for every foldable region.
export function computeFoldRanges(lines: string[]): Map<number, number> {
	const ranges = new Map<number, number>();
	const open: { line: number; indent: number }[] = [];
	let prev: { line: number; indent: number } | null = null;

	for (let i = 0; i < lines.length; i++) {
		const indent = indentWidth(lines[i]);
		if (indent === null) continue;
		if (prev) {
			while (open.length > 0 && open[open.length - 1].indent >= indent) {
				const header = open.pop();
				if (header) ranges.set(header.line, prev.line);
			}
			if (indent > prev.indent) open.push(prev);
		}
		prev = { line: i, indent };
	}
	for (const header of open) {
		if (prev) ranges.set(header.line, prev.line);
	}
	return ranges;
}

function lineAtOffset(lineStarts: number[], offset: number): number {
	let lo = 0;
	let hi = lineStarts.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (lineStarts[mid] <= offset) lo = mid;
		else hi = mid - 1;
	}
	return lo;
}

function lineStartsOf(lines: string[]): number[] {
	const starts: number[] = [];
	let offset = 0;
	for (const line of lines) {
		starts.push(offset);
		offset += line.length + 1;
	}
	return starts;
}

// The code as it's shown with folds applied. The editor's textarea holds
// `displayCode` (visible lines only), so every caret offset and edit has to
// be translated between display and full-source coordinates.
export interface FoldView {
	code: string;
	lines: string[];
	ranges: Map<number, number>;
	// Folded headers that are actually visible, mapped to their last hidden
	// line. Folds nested inside a collapsed region stay remembered but
	// aren't listed here until the outer region opens.
	folded: Map<number, number>;
	// Full line index for each display line.
	visible: number[];
	displayCode: string;
	toFull: (displayOffset: number) => number;
	toDisplay: (fullOffset: number) => number;
}

export function buildFoldView(code: string, foldedLines: number[]): FoldView {
	const lines = code.split("\n");
	const ranges = computeFoldRanges(lines);
	const requested = new Set(foldedLines);
	const folded = new Map<number, number>();
	const visible: number[] = [];
	// For hidden lines, the display line of the header that hides them.
	const displayLineOfFull: number[] = new Array(lines.length);

	for (let i = 0; i < lines.length; i++) {
		const displayLine = visible.length;
		visible.push(i);
		displayLineOfFull[i] = displayLine;
		const end = ranges.get(i);
		if (end !== undefined && requested.has(i)) {
			folded.set(i, end);
			for (let hidden = i + 1; hidden <= end; hidden++) {
				displayLineOfFull[hidden] = displayLine;
			}
			i = end;
		}
	}

	const fullStarts = lineStartsOf(lines);
	const visibleLines = visible.map((line) => lines[line]);
	const displayStarts = lineStartsOf(visibleLines);

	return {
		code,
		lines,
		ranges,
		folded,
		visible,
		displayCode: visibleLines.join("\n"),
		toFull(displayOffset) {
			const displayLine = lineAtOffset(displayStarts, displayOffset);
			const fullLine = visible[displayLine];
			const col = Math.min(
				displayOffset - displayStarts[displayLine],
				lines[fullLine].length,
			);
			return fullStarts[fullLine] + col;
		},
		toDisplay(fullOffset) {
			const fullLine = lineAtOffset(fullStarts, fullOffset);
			const displayLine = displayLineOfFull[fullLine];
			if (visible[displayLine] !== fullLine) {
				return displayStarts[displayLine] + visibleLines[displayLine].length;
			}
			const col = Math.min(
				fullOffset - fullStarts[fullLine],
				lines[fullLine].length,
			);
			return displayStarts[displayLine] + col;
		},
	};
}

export function fullLineAtDisplayOffset(
	view: FoldView,
	displayOffset: number,
): number {
	const displayLine =
		view.displayCode.slice(0, displayOffset).split("\n").length - 1;
	return view.visible[displayLine] ?? 0;
}

// Maps a display selection to the full source it stands for. A selection
// that covers a folded header line in full also takes that header's hidden
// lines with it, so copying or deleting a collapsed block acts on the
// whole block rather than leaving its body orphaned.
export function toFullRange(
	view: FoldView,
	start: number,
	end: number,
): { start: number; end: number } {
	let fullStart = view.toFull(start);
	let fullEnd = view.toFull(end);
	if (start === end) return { start: fullStart, end: fullEnd };
	const fullStarts = lineStartsOf(view.lines);
	for (const [header, last] of view.folded) {
		const headerStart = view.toDisplay(fullStarts[header]);
		const headerEnd = headerStart + view.lines[header].length;
		if (start <= headerStart && end >= headerEnd) {
			fullStart = Math.min(fullStart, fullStarts[header]);
			fullEnd = Math.max(fullEnd, fullStarts[last] + view.lines[last].length);
		}
	}
	return { start: fullStart, end: fullEnd };
}

// Finds the replaced range between two versions of the textarea text. The
// caret position after the change anchors where the edit ended, so typing
// a character next to an identical one is attributed to the right spot.
export function diffText(
	prev: string,
	next: string,
	caret: number,
): { start: number; end: number; inserted: string } {
	const suffix = next.length - caret;
	if (
		suffix >= 0 &&
		suffix <= prev.length &&
		prev.slice(prev.length - suffix) === next.slice(caret)
	) {
		const maxPrefix = Math.min(caret, prev.length - suffix);
		let prefix = 0;
		while (prefix < maxPrefix && prev[prefix] === next[prefix]) prefix++;
		return {
			start: prefix,
			end: prev.length - suffix,
			inserted: next.slice(prefix, caret),
		};
	}
	let prefix = 0;
	const minLength = Math.min(prev.length, next.length);
	while (prefix < minLength && prev[prefix] === next[prefix]) prefix++;
	let tail = 0;
	while (
		tail < minLength - prefix &&
		prev[prev.length - 1 - tail] === next[next.length - 1 - tail]
	) {
		tail++;
	}
	return {
		start: prefix,
		end: prev.length - tail,
		inserted: next.slice(prefix, next.length - tail),
	};
}

function countNewlines(text: string): number {
	let count = 0;
	for (const char of text) if (char === "\n") count++;
	return count;
}

// Carries fold headers across a full-source edit: headers below the edit
// shift with the line count, headers the edit rewrites across lines are
// dropped, and anything no longer foldable afterwards is discarded.
export function remapFolds(
	view: FoldView,
	foldedLines: number[],
	fullStart: number,
	fullEnd: number,
	inserted: string,
	nextCode: string,
): number[] {
	const fullStarts = lineStartsOf(view.lines);
	const startLine = lineAtOffset(fullStarts, fullStart);
	const endLine = lineAtOffset(fullStarts, fullEnd);
	const insertedLines = countNewlines(inserted);
	const delta = insertedLines - (endLine - startLine);
	const multiline = startLine !== endLine || insertedLines > 0;

	const next = new Set<number>();
	for (const header of foldedLines) {
		const headerStart = fullStarts[header];
		if (headerStart === undefined) continue;
		const headerEnd = headerStart + view.lines[header].length;
		if (fullEnd <= headerStart) next.add(header + delta);
		else if (fullStart > headerEnd || !multiline) next.add(header);
	}

	const ranges = computeFoldRanges(nextCode.split("\n"));
	return [...next].filter((line) => ranges.has(line)).sort((a, b) => a - b);
}

export interface FoldEditResult {
	code: string;
	foldedLines: number[];
	// Full-source selection to restore once the edit renders.
	selection: { start: number; end: number };
}

// Applies a textarea edit (in display coordinates) to the full source.
// Typing right at a collapsed header's end, or deleting the line break
// that joins it to the next visible line, opens the fold instead of
// silently rewriting lines the user can't see.
export function applyDisplayEdit(
	view: FoldView,
	foldedLines: number[],
	start: number,
	end: number,
	inserted: string,
): FoldEditResult {
	const fullStarts = lineStartsOf(view.lines);
	const unfold = new Set<number>();
	let cancel = false;

	for (const header of view.folded.keys()) {
		const joint = view.toDisplay(
			fullStarts[header] + view.lines[header].length,
		);
		if (start === end && start === joint) {
			unfold.add(header);
		} else if (start === joint && end === joint + 1 && inserted === "") {
			unfold.add(header);
			cancel = true;
		}
	}

	const remaining = foldedLines.filter((line) => !unfold.has(line));
	if (cancel) {
		const caret = view.toFull(start);
		return {
			code: view.code,
			foldedLines: remaining,
			selection: { start: caret, end: caret },
		};
	}

	const range = toFullRange(view, start, end);
	const code =
		view.code.slice(0, range.start) + inserted + view.code.slice(range.end);
	const caret = range.start + inserted.length;
	return {
		code,
		foldedLines: remapFolds(
			view,
			remaining,
			range.start,
			range.end,
			inserted,
			code,
		),
		selection: { start: caret, end: caret },
	};
}

// Indents or dedents every line a display selection touches. A collapsed
// header drags its hidden lines along, so the block keeps its shape (and
// stays folded) instead of only its first line moving.
export function applyIndent(
	view: FoldView,
	foldedLines: number[],
	start: number,
	end: number,
	dedent: boolean,
	indent: string,
): FoldEditResult {
	const { code, lines } = view;
	const fullStarts = lineStartsOf(lines);
	const range = toFullRange(view, start, end);
	const firstLine = lineAtOffset(fullStarts, range.start);
	const selectionEndLine = lineAtOffset(fullStarts, range.end);
	let lastLine = selectionEndLine;
	for (const [header, last] of view.folded) {
		if (header >= firstLine && header <= lastLine) {
			lastLine = Math.max(lastLine, last);
		}
	}

	let firstDelta = 0;
	let selectionEndDelta = 0;
	const transformed = lines.slice(firstLine, lastLine + 1).map((line, i) => {
		const lineIndex = firstLine + i;
		let delta: number;
		let next: string;
		if (dedent) {
			const cut = line.startsWith("\t")
				? 1
				: (line.match(/^ {1,2}/)?.[0].length ?? 0);
			delta = -cut;
			next = line.slice(cut);
		} else {
			delta = indent.length;
			next = indent + line;
		}
		if (lineIndex === firstLine) firstDelta = delta;
		if (lineIndex <= selectionEndLine) selectionEndDelta += delta;
		return next;
	});

	const regionStart = fullStarts[firstLine];
	const regionEnd = fullStarts[lastLine] + lines[lastLine].length;
	const nextCode =
		code.slice(0, regionStart) + transformed.join("\n") + code.slice(regionEnd);
	const ranges = computeFoldRanges(nextCode.split("\n"));
	return {
		code: nextCode,
		foldedLines: foldedLines.filter((line) => ranges.has(line)),
		selection: {
			start: Math.max(regionStart, range.start + firstDelta),
			end: range.end + selectionEndDelta,
		},
	};
}

// Innermost region around `line` that isn't already collapsed.
export function foldTargetAt(
	view: FoldView,
	foldedLines: number[],
	line: number,
): number | null {
	const folded = new Set(foldedLines);
	let target: number | null = null;
	for (const [header, last] of view.ranges) {
		if (header > line || line > last || folded.has(header)) continue;
		if (target === null || header > target) target = header;
	}
	return target;
}
