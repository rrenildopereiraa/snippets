import { Input } from "@base-ui/react/input";
import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import type { ResolvedMode } from "../lib/chrome-theme";
import { patternLineColor } from "../lib/color";
import type { LanguageId } from "../lib/highlighter";
import { LANGUAGES } from "../lib/highlighter";
import {
	ASPECT_RATIO_VALUES,
	type AspectRatio,
	type BackgroundPattern,
	type HighlightedLine,
	type HighlightedWord,
} from "../lib/types";
import { CodeEditor } from "./code-editor";
import type { CornerRadii } from "./inspector";

export interface FrameColors {
	page: string;
	surface: string;
	border: string;
	accentDim: string;
	tabBar: string;
	tabActive: string;
	statusBarBg: string;
	statusBarText: string;
	highlightMark: string;
	highlightAdd: string;
	highlightRemove: string;
}

// Diagonal hatch texture. The line color is derived from the page color
// itself (not the independently-editable border color) so it always stays
// visible, live, no matter what page color is picked.
function getPatternStyle(
	pattern: BackgroundPattern,
	page: string,
): React.CSSProperties | null {
	const line = patternLineColor(page);
	switch (pattern) {
		case "stripes-right":
			return {
				backgroundImage: `repeating-linear-gradient(45deg, transparent 0, transparent 7px, ${line} 7px, ${line} 9px)`,
				backgroundColor: page,
			};
		case "stripes-left":
			return {
				backgroundImage: `repeating-linear-gradient(-45deg, transparent 0, transparent 7px, ${line} 7px, ${line} 9px)`,
				backgroundColor: page,
			};
	}
}

const FRAME_PADDING = 64;

// How far the background pattern and grid lines extend beyond the code
// frame. With an aspect ratio the outer frame letterboxes (grows beyond
// the code frame + padding), and these overlays must still cover the whole
// exported area. The outer frame clips them with overflow hidden, so any
// value comfortably larger than the biggest letterbox works.
const FRAME_OVERFLOW = 4000;

export const Frame = forwardRef<
	HTMLDivElement,
	{
		code: string;
		onCodeChange: (value: string) => void;
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
		viewportRef: React.RefObject<HTMLElement | null>;
		mode: ResolvedMode;
	}
>(function Frame(
	{
		code,
		onCodeChange,
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
		viewportRef,
		mode,
	},
	ref,
) {
	const fontStyle = fontFamily ? { fontFamily } : undefined;
	const borderRadius = `${radii.tl}px ${radii.tr}px ${radii.br}px ${radii.bl}px`;
	const patternStyle = getPatternStyle(background, colors.page);
	const ratioValue = ASPECT_RATIO_VALUES[aspectRatio];
	const contentRef = useRef<HTMLDivElement>(null);

	// Fit-to-frame for fixed ratios. The outer box is locked to the largest
	// exact-ratio rectangle that fits the viewport, so it can never outgrow
	// the canvas; the code frame is then zoomed down (uniformly, never up and
	// never stretched) to fit inside it. `auto` stays untouched.
	const [fit, setFit] = useState<{
		width: number;
		height: number;
		scale: number;
	} | null>(null);

	useLayoutEffect(() => {
		if (!ratioValue) {
			setFit(null);
			return;
		}
		const viewport = viewportRef.current;
		const content = contentRef.current;
		if (!viewport || !content) return;

		const [ratioWidth, ratioHeight] = ratioValue.split(" / ").map(Number) as [
			number,
			number,
		];
		const ratio = ratioWidth / ratioHeight;

		let raf = 0;
		const update = () => {
			const viewportStyle = getComputedStyle(viewport);
			const padX =
				parseFloat(viewportStyle.paddingLeft) +
				parseFloat(viewportStyle.paddingRight);
			const padY =
				parseFloat(viewportStyle.paddingTop) +
				parseFloat(viewportStyle.paddingBottom);
			// A tiny buffer stops sub-pixel rounding from producing a 1px
			// scrollbar on the canvas.
			const availWidth = Math.max(0, viewport.clientWidth - padX - 2);
			const availHeight = Math.max(0, viewport.clientHeight - padY - 2);

			const boxWidth = Math.min(availWidth, availHeight * ratio);
			const boxHeight = boxWidth / ratio;

			const naturalWidth = content.offsetWidth;
			const naturalHeight = content.offsetHeight;
			const scale = Math.min(
				1,
				(boxWidth - FRAME_PADDING * 2) / naturalWidth,
				(boxHeight - FRAME_PADDING * 2) / naturalHeight,
			);

			setFit({
				width: boxWidth,
				height: boxHeight,
				scale: Number.isFinite(scale) ? scale : 1,
			});
		};

		const observer = new ResizeObserver(() => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(update);
		});
		observer.observe(viewport);
		observer.observe(content);
		update();

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
		};
	}, [ratioValue, viewportRef]);

	return (
		<div
			ref={ref}
			className="p-r min-w-0 o-h"
			style={{
				padding: FRAME_PADDING,
				backgroundColor: colors.page,
				...(ratioValue
					? {
							// Locked to the fitted rectangle once measured; the
							// aspect-ratio only fills the pre-measure frame so the
							// first (unpainted) render is already shaped.
							width: fit ? fit.width : undefined,
							height: fit ? fit.height : undefined,
							aspectRatio: fit ? undefined : ratioValue,
							// Centres the code frame in the letterboxed space.
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}
					: {}),
			}}
		>
			<div
				ref={contentRef}
				className={
					ratioValue ? "p-r zi-10 w-192 o-v" : "p-r zi-10 w-192 max-w-100% o-v"
				}
				style={{
					backgroundColor: colors.surface,
					borderRadius,
					transform: fit ? `scale(${fit.scale})` : undefined,
					transformOrigin: "center",
				}}
			>
				{showBackgroundPattern && patternStyle && (
					<div
						className="p-a o-h zi--10"
						style={{
							...patternStyle,
							top: -FRAME_OVERFLOW,
							right: -FRAME_OVERFLOW,
							bottom: -FRAME_OVERFLOW,
							left: -FRAME_OVERFLOW,
						}}
						aria-hidden="true"
					/>
				)}

				{showGridLines && (
					<>
						<div
							className="p-a t-0 h-px"
							style={{
								left: -FRAME_OVERFLOW,
								right: -FRAME_OVERFLOW,
								backgroundColor: colors.border,
							}}
							aria-hidden="true"
						/>
						<div
							className="p-a b-0 h-px"
							style={{
								left: -FRAME_OVERFLOW,
								right: -FRAME_OVERFLOW,
								backgroundColor: colors.border,
							}}
							aria-hidden="true"
						/>
						<div
							className="p-a l-0 w-px"
							style={{
								top: -FRAME_OVERFLOW,
								bottom: -FRAME_OVERFLOW,
								backgroundColor: colors.border,
							}}
							aria-hidden="true"
						/>
						<div
							className="p-a r-0 w-px"
							style={{
								top: -FRAME_OVERFLOW,
								bottom: -FRAME_OVERFLOW,
								backgroundColor: colors.border,
							}}
							aria-hidden="true"
						/>
					</>
				)}

				<div
					className="d-f bw-1 bs-s o-h"
					style={{
						backgroundColor: colors.surface,
						borderColor: colors.border,
						borderRadius,
					}}
				>
					<div className="f-1 min-w-0 min-h-0">
						<div
							className={`frame-collapsible ${showTabBar ? "frame-collapsible-open" : ""}`}
						>
							<div className="o-h min-h-0">
								<div className="d-f" style={{ backgroundColor: colors.tabBar }}>
									<div
										className="d-f ai-c g-2 px-4 py-3"
										style={{
											backgroundColor: colors.tabActive,
											borderRight: `1px solid ${colors.border}`,
										}}
									>
										<Input
											value={fileName}
											onChange={(event) => onFileNameChange(event.target.value)}
											size={Math.max(fileName.length, 10)}
											spellCheck={false}
											placeholder="Untitled-1"
											className="ff-m fs-sm bg-transparent bw-0 os-none p-0 w-fc"
											style={{ color: colors.accentDim, ...fontStyle }}
										/>
									</div>
									<div
										className="f-1"
										style={{ borderBottom: `1px solid ${colors.border}` }}
										aria-hidden="true"
									/>
								</div>
							</div>
						</div>

						<div className="p-4" style={{ backgroundColor: colors.tabActive }}>
							<CodeEditor
								code={code}
								onCodeChange={onCodeChange}
								language={language}
								themeName={themeName}
								fontFamily={fontFamily}
								background={colors.tabActive}
								highlightedLines={highlightedLines}
								highlightedWords={highlightedWords}
								onCycleLineHighlight={onCycleLineHighlight}
								onSetLineRangeHighlight={onSetLineRangeHighlight}
								onCycleWordHighlight={onCycleWordHighlight}
								onSetWordRangeHighlight={onSetWordRangeHighlight}
								textareaRef={textareaRef}
								mode={mode}
								highlightColors={{
									mark: colors.highlightMark,
									add: colors.highlightAdd,
									remove: colors.highlightRemove,
								}}
							/>
						</div>

						<div
							className={`frame-collapsible ${showStatusBar ? "frame-collapsible-open" : ""}`}
						>
							<div className="o-h min-h-0">
								<div
									className="d-f ai-c jc-fe px-4 py-2 btw-1 bs-s"
									style={{
										backgroundColor: colors.statusBarBg,
										borderColor: colors.border,
									}}
								>
									<span
										className="ff-m fs-xs fw-700"
										style={{ color: colors.statusBarText, ...fontStyle }}
									>
										{LANGUAGES[language]}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
});
