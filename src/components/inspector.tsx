import { Button } from "@base-ui/react/button";
import { Separator } from "@base-ui/react/separator";
import { Switch } from "@base-ui/react/switch";
import { Tabs } from "@base-ui/react/tabs";
import { ShuffleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import {
	type ChromeMode,
	type FrameMode,
	useChromeTheme,
} from "../lib/chrome-theme";
import { LANGUAGES, type LanguageId, THEMES } from "../lib/highlighter";
import {
	ASPECT_RATIOS,
	type AspectRatio,
	type BackgroundPattern,
	type CornerRadii,
} from "../lib/types";
import { BottomSheet } from "./bottom-sheet";
import { ColorInput } from "./color-input";
import type { FrameColors } from "./frame";
import { PickerField } from "./picker-field";
import { RadiusControl } from "./radius-control";

export type { CornerRadii };

const PATTERN_LABELS: Record<BackgroundPattern, string> = {
	"stripes-right": "Stripes Right",
	"stripes-left": "Stripes Left",
};

const CHROME_MODE_OPTIONS: { id: ChromeMode; label: string }[] = [
	{ id: "light", label: "Light" },
	{ id: "dark", label: "Dark" },
	{ id: "auto", label: "Auto (OS)" },
];

// The frame code block's own light/dark preference, independent of the
// app scheme. Auto keeps the frame following the app.
const FRAME_MODE_OPTIONS: { id: FrameMode; label: string }[] = [
	{ id: "light", label: "Light" },
	{ id: "dark", label: "Dark" },
	{ id: "auto", label: "Auto (app)" },
];

export type FontFamilyId =
	| "default"
	| "jetbrains-mono"
	| "fira-code"
	| "ibm-plex-mono";

export const FONT_FAMILIES: Record<
	FontFamilyId,
	{ label: string; stack?: string }
> = {
	default: { label: "System Mono" },
	"jetbrains-mono": {
		label: "JetBrains Mono",
		stack: '"JetBrains Mono", monospace',
	},
	"fira-code": { label: "Fira Code", stack: '"Fira Code", monospace' },
	"ibm-plex-mono": {
		label: "IBM Plex Mono",
		stack: '"IBM Plex Mono", monospace',
	},
};

const FRAME_COLOR_FIELDS: { key: keyof FrameColors; label: string }[] = [
	{ key: "page", label: "Frame Background" },
	{ key: "surface", label: "Frame Surface" },
	{ key: "border", label: "Frame Border" },
	{ key: "accentDim", label: "Frame Text" },
	{ key: "tabBar", label: "Tab Bar" },
	{ key: "tabActive", label: "Active Tab" },
	{ key: "statusBarBg", label: "Status Bar" },
	{ key: "statusBarText", label: "Status Bar Text" },
	{ key: "highlightMark", label: "Highlight" },
	{ key: "highlightAdd", label: "Highlight Add" },
	{ key: "highlightRemove", label: "Highlight Remove" },
];

type SettingsTab = "layout" | "style";

function SettingsTabs({
	tab,
	onTabChange,
}: {
	tab: SettingsTab;
	onTabChange: (value: SettingsTab) => void;
}) {
	return (
		<div className="mt--3 mx--3 mb-3">
			<Tabs.Root
				value={tab}
				onValueChange={(value) => {
					if (value) onTabChange(value as SettingsTab);
				}}
			>
				<Tabs.List className="d-f">
					<Tabs.Tab
						value="layout"
						className={(state) =>
							`f-1 px-3 py-2 fs-xs ff-m ta-c us-none c-p brw-1 bs-s bc-border c-accent-dim fv:os-s fv:oo--2 fv:oc-accent ${state.active ? "bg-surface fw-700" : "bg-page bbw-1"}`
						}
					>
						Layout
					</Tabs.Tab>
					<Tabs.Tab
						value="style"
						className={(state) =>
							`f-1 px-3 py-2 fs-xs ff-m ta-c us-none c-p bc-border c-accent-dim fv:os-s fv:oo--2 fv:oc-accent ${state.active ? "bg-surface fw-700" : "bg-page bbw-1"}`
						}
					>
						Style
					</Tabs.Tab>
				</Tabs.List>
			</Tabs.Root>
		</div>
	);
}

function SectionSeparator({ label }: { label: string }) {
	return (
		<div className="d-f ai-c g-2 pb-2">
			<Separator orientation="horizontal" className="w-3 h-px bg-border" />
			<span className="fs-xs ff-m us-none ws-nw c-accent-dim">{label}</span>
			<Separator orientation="horizontal" className="f-1 h-px bg-border" />
		</div>
	);
}

function OptionSwitch({
	label,
	checked,
	onCheckedChange,
	disabled,
}: {
	label: string;
	checked: boolean;
	onCheckedChange: (value: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<div
			className="d-f ai-c jc-sb g-2 px-2 pb-3"
			style={disabled ? { opacity: 0.5 } : undefined}
		>
			<span className="fs-sm ff-m us-none c-accent-dim">{label}</span>
			<Switch.Root
				checked={checked}
				onCheckedChange={onCheckedChange}
				disabled={disabled}
				className={`switch-root p-r d-f ai-c h-5 w-9 m-0 px-1 bw-1 bs-s c-p fv:os-s fv:oo-2 fv:oc-accent ${
					checked ? "bg-accent bc-accent" : "bg-page bc-border"
				}`}
			>
				<Switch.Thumb
					className={`switch-thumb w-4 h-3 bs-o-xs ${checked ? "ml-3 bg-page" : "ml-0 bg-accent-dim"}`}
				/>
			</Switch.Root>
		</div>
	);
}

interface InspectorContentProps {
	tab: SettingsTab;
	showTabBar: boolean;
	onShowTabBarChange: (value: boolean) => void;
	showStatusBar: boolean;
	onShowStatusBarChange: (value: boolean) => void;
	showBackgroundPattern: boolean;
	onShowBackgroundPatternChange: (value: boolean) => void;
	showGridLines: boolean;
	onShowGridLinesChange: (value: boolean) => void;
	showBoundingBox: boolean;
	onShowBoundingBoxChange: (value: boolean) => void;
	background: BackgroundPattern;
	onBackgroundChange: (value: BackgroundPattern) => void;
	aspectRatio: AspectRatio;
	onAspectRatioChange: (value: AspectRatio) => void;
	radii: CornerRadii;
	onRadiiChange: (value: CornerRadii) => void;
	fontFamily: FontFamilyId;
	onFontFamilyChange: (value: FontFamilyId) => void;
	themeName: string;
	onThemeChange: (value: string) => void;
	themeIsRandom: boolean;
	frameMode: FrameMode;
	onFrameModeChange: (value: FrameMode) => void;
	frameColors: FrameColors;
	onFrameColorsChange: (value: FrameColors) => void;
	onUploadTheme: (file: File) => void;
}

function InspectorContent({
	tab,
	showTabBar,
	onShowTabBarChange,
	showStatusBar,
	onShowStatusBarChange,
	showBackgroundPattern,
	onShowBackgroundPatternChange,
	showGridLines,
	onShowGridLinesChange,
	showBoundingBox,
	onShowBoundingBoxChange,
	background,
	onBackgroundChange,
	aspectRatio,
	onAspectRatioChange,
	radii,
	onRadiiChange,
	fontFamily,
	onFontFamilyChange,
	themeName,
	onThemeChange,
	themeIsRandom,
	frameMode,
	onFrameModeChange,
	frameColors,
	onFrameColorsChange,
	onUploadTheme,
}: InspectorContentProps) {
	if (tab === "layout") {
		return (
			<>
				<OptionSwitch
					label="Tab Bar"
					checked={showTabBar}
					onCheckedChange={onShowTabBarChange}
				/>
				<OptionSwitch
					label="Bounding Box"
					checked={showBoundingBox}
					onCheckedChange={onShowBoundingBoxChange}
				/>
				<OptionSwitch
					label="Status Bar"
					checked={showStatusBar}
					onCheckedChange={onShowStatusBarChange}
				/>

				<RadiusControl radii={radii} onRadiiChange={onRadiiChange} />

				<PickerField
					label="Aspect Ratio"
					value={aspectRatio}
					options={ASPECT_RATIOS.map(({ id, label }) => ({ id, label }))}
					onValueChange={onAspectRatioChange}
				/>

				<PickerField
					label="Font Family"
					value={fontFamily}
					options={(Object.keys(FONT_FAMILIES) as FontFamilyId[]).map((id) => ({
						id,
						label: FONT_FAMILIES[id].label,
						style: FONT_FAMILIES[id].stack
							? { fontFamily: FONT_FAMILIES[id].stack }
							: undefined,
					}))}
					onValueChange={onFontFamilyChange}
				/>
			</>
		);
	}

	return (
		<>
			<SectionSeparator label="Background" />

			<OptionSwitch
				label="Grid Lines"
				checked={showGridLines}
				onCheckedChange={onShowGridLinesChange}
			/>

			<OptionSwitch
				label="Background Patterns"
				checked={showBackgroundPattern}
				onCheckedChange={onShowBackgroundPatternChange}
			/>

			{showBackgroundPattern && (
				<PickerField
					value={background}
					options={(Object.keys(PATTERN_LABELS) as BackgroundPattern[]).map(
						(id) => ({ id, label: PATTERN_LABELS[id] }),
					)}
					onValueChange={onBackgroundChange}
				/>
			)}

			<SectionSeparator label="Appearance" />

			<PickerField
				label="Theme"
				value={themeName}
				options={Object.keys(THEMES).map((id) => ({ id, label: id }))}
				onValueChange={onThemeChange}
				badge={
					themeIsRandom
						? { text: "*", title: "Randomly selected theme" }
						: undefined
				}
			/>

			<PickerField
				label="Frame Theme"
				value={frameMode}
				options={FRAME_MODE_OPTIONS}
				onValueChange={onFrameModeChange}
			/>

			<div className="px-2 pb-4">
				<Button
					onClick={() => {
						const input = document.createElement("input");
						input.type = "file";
						input.accept = ".json";
						input.onchange = () => {
							const file = input.files?.[0];
							if (file) onUploadTheme(file);
						};
						input.click();
					}}
					className="d-f ai-c jc-c g-2 w-100% px-2 py-2 bw-1 bs-d bg-transparent fs-xs ff-m us-none c-p bc-border c-accent-dim h:bc-accent h:c-accent fv:os-s fv:oo-2 fv:oc-accent"
				>
					<UploadSimpleIcon size={14} weight="fill" />
					Import VS Code Theme
				</Button>
			</div>

			{FRAME_COLOR_FIELDS.map(({ key, label }) => (
				<ColorInput
					key={key}
					label={label}
					value={frameColors[key]}
					onChange={(value) =>
						onFrameColorsChange({ ...frameColors, [key]: value })
					}
				/>
			))}
		</>
	);
}

export function Inspector({
	open,
	onOpenChange,
	language,
	onLanguageChange,
	onRandomize,
	...contentProps
}: Omit<InspectorContentProps, "tab"> & {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	language: LanguageId;
	onLanguageChange: (value: LanguageId) => void;
	onRandomize: () => void;
}) {
	const [tab, setTab] = useState<SettingsTab>("layout");
	const { mode, setMode } = useChromeTheme();

	return (
		<>
			<aside className="d-none @lg:d-f fd-c w-72 fs-0 min-h-0 oy-auto blw-1 bs-s bc-border bg-surface p-3">
				<SettingsTabs tab={tab} onTabChange={setTab} />
				<InspectorContent tab={tab} {...contentProps} />
			</aside>

			<BottomSheet open={open} onOpenChange={onOpenChange} title="Settings">
				<SettingsTabs tab={tab} onTabChange={setTab} />

				<SectionSeparator label="Quick Actions" />

				<PickerField
					label="Appearance"
					value={mode}
					options={CHROME_MODE_OPTIONS}
					onValueChange={setMode}
				/>

				<PickerField
					label="Language"
					value={language}
					options={Object.entries(LANGUAGES).map(([id, label]) => ({
						id: id as LanguageId,
						label,
					}))}
					onValueChange={onLanguageChange}
				/>

				<div className="px-2 pb-4">
					<Button
						onClick={onRandomize}
						className="d-f ai-c jc-c g-2 w-100% px-2 py-2 bw-1 bs-d bg-transparent fs-xs ff-m us-none c-p bc-border c-accent-dim h:bc-accent h:c-accent fv:os-s fv:oo-2 fv:oc-accent"
					>
						<ShuffleIcon size={14} weight="bold" />
						Randomize
					</Button>
				</div>

				<InspectorContent tab={tab} {...contentProps} />
			</BottomSheet>
		</>
	);
}
