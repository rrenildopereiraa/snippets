import { useRef } from "react";
import type { ResolvedMode } from "../lib/chrome-theme";
import type { LanguageId } from "../lib/highlighter";
import type {
	AspectRatio,
	BackgroundPattern,
	HighlightedLine,
	HighlightedWord,
} from "../lib/types";
import { BoundingBox } from "./bounding-box";
import { Frame, type FrameColors } from "./frame";
import type { CornerRadii } from "./inspector";

export function Canvas({
	code,
	onCodeChange,
	foldedLines,
	onFoldedLinesChange,
	language,
	fileName,
	onFileNameChange,
	highlightedLines,
	highlightedWords,
	onCycleLineHighlight,
	onSetLineRangeHighlight,
	onCycleWordHighlight,
	onSetWordRangeHighlight,
	textareaRef,
	showTabBar,
	showStatusBar,
	showGridLines,
	showBackgroundPattern,
	background,
	aspectRatio,
	radii,
	fontFamily,
	themeName,
	colors,
	showBoundingBox,
	frameRef,
	mode,
}: {
	code: string;
	onCodeChange: (value: string) => void;
	foldedLines: number[];
	onFoldedLinesChange: (lines: number[]) => void;
	language: LanguageId;
	fileName: string;
	onFileNameChange: (value: string) => void;
	highlightedLines: HighlightedLine[];
	highlightedWords: HighlightedWord[];
	onCycleLineHighlight: (line: number) => void;
	onSetLineRangeHighlight: (startLine: number, endLine: number) => void;
	onCycleWordHighlight: (
		line: number,
		startCol: number,
		endCol: number,
	) => void;
	onSetWordRangeHighlight: (
		ranges: { line: number; startCol: number; endCol: number }[],
	) => void;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	showTabBar: boolean;
	showStatusBar: boolean;
	showGridLines: boolean;
	showBackgroundPattern: boolean;
	background: BackgroundPattern;
	aspectRatio: AspectRatio;
	radii: CornerRadii;
	fontFamily?: string;
	themeName: string;
	colors: FrameColors;
	showBoundingBox: boolean;
	frameRef: React.RefObject<HTMLDivElement | null>;
	mode: ResolvedMode;
}) {
	const viewportRef = useRef<HTMLElement>(null);

	return (
		<main
			ref={viewportRef}
			className="f-1 d-f min-h-0 min-w-0 o-auto px-2 @sm:px-4 py-8 @sm:py-16"
		>
			<div className="m-auto p-r min-w-0">
				<Frame
					ref={frameRef}
					code={code}
					onCodeChange={onCodeChange}
					foldedLines={foldedLines}
					onFoldedLinesChange={onFoldedLinesChange}
					language={language}
					fileName={fileName}
					onFileNameChange={onFileNameChange}
					highlightedLines={highlightedLines}
					highlightedWords={highlightedWords}
					onCycleLineHighlight={onCycleLineHighlight}
					onSetLineRangeHighlight={onSetLineRangeHighlight}
					onCycleWordHighlight={onCycleWordHighlight}
					onSetWordRangeHighlight={onSetWordRangeHighlight}
					textareaRef={textareaRef}
					showTabBar={showTabBar}
					showStatusBar={showStatusBar}
					showGridLines={showGridLines}
					showBackgroundPattern={showBackgroundPattern}
					background={background}
					aspectRatio={aspectRatio}
					radii={radii}
					fontFamily={fontFamily}
					themeName={themeName}
					colors={colors}
					viewportRef={viewportRef}
					mode={mode}
				/>

				{showBoundingBox && <BoundingBox />}
			</div>
		</main>
	);
}
