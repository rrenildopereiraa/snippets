import { Button } from "@base-ui/react/button";
import { Separator } from "@base-ui/react/separator";
import {
	MonitorIcon,
	MoonIcon,
	ShuffleIcon,
	SunIcon,
} from "@phosphor-icons/react";
import type { ChromeMode } from "../lib/chrome-theme";
import { useChromeTheme } from "../lib/chrome-theme";
import type { LanguageId } from "../lib/highlighter";
import type { BackgroundPattern } from "../lib/types";
import { LanguagePicker } from "./language-picker";
import { Tooltip } from "./tooltip";

const PATTERN_LABELS: Record<BackgroundPattern, string> = {
	"stripes-right": "Stripes Right",
	"stripes-left": "Stripes Left",
};

const MODE_ICON: Record<ChromeMode, typeof SunIcon> = {
	light: SunIcon,
	dark: MoonIcon,
	auto: MonitorIcon,
};

const MODE_TOOLTIP: Record<ChromeMode, string> = {
	light: "Light theme — click for dark",
	dark: "Dark theme — click for auto",
	auto: "Auto theme (follows OS) — click for light",
};

export function StatusBar({
	language,
	onLanguageChange,
	background,
	onBackgroundChange,
	onRandomize,
}: {
	language: LanguageId;
	onLanguageChange: (value: LanguageId) => void;
	background: BackgroundPattern;
	onBackgroundChange: (value: BackgroundPattern) => void;
	onRandomize: () => void;
}) {
	const { mode, cycleMode } = useChromeTheme();
	const PATTERNS = Object.keys(PATTERN_LABELS) as BackgroundPattern[];
	const ModeIcon = MODE_ICON[mode];

	function cycleBackground() {
		const idx = PATTERNS.indexOf(background);
		const next = PATTERNS[(idx + 1) % PATTERNS.length];
		onBackgroundChange(next);
	}

	return (
		<footer className="d-none @lg:d-f ai-c btw-1 bs-s bc-border bg-surface">
			<LanguagePicker value={language} onValueChange={onLanguageChange} />

			<div className="d-none @lg:d-f ai-c">
				<Separator orientation="vertical" className="h-4 w-px bg-border" />

				<Button
					onClick={cycleBackground}
					className="w-28 ta-c py-1 bg-transparent fs-xs ff-m us-none c-p c-accent-dim h:c-accent h:bg-page fv:os-s fv:oo--2 fv:oc-accent"
				>
					{PATTERN_LABELS[background]}
				</Button>
			</div>

			<Separator orientation="vertical" className="h-4 w-px bg-border" />

			<Tooltip content="Randomize appearance">
				<Button
					onClick={onRandomize}
					aria-label="Randomize appearance"
					className="d-f ai-c jc-c g-1 px-2 py-1 bg-transparent fs-xs ff-m us-none bw-0 c-p c-accent-dim h:c-accent h:bg-page fv:os-s fv:oo--2 fv:oc-accent"
				>
					<ShuffleIcon size={13} weight="bold" />
					Randomize
				</Button>
			</Tooltip>

			<div className="f-1" />

			<div className="d-none @lg:d-f ai-c">
				<Tooltip content={MODE_TOOLTIP[mode]}>
					<Button
						onClick={cycleMode}
						aria-label={MODE_TOOLTIP[mode]}
						className="d-f ai-c jc-c px-3 py-1 bg-transparent bw-0 c-p c-accent-dim h:c-accent h:bg-page fv:os-s fv:oo--2 fv:oc-accent"
					>
						<ModeIcon size={13} weight="bold" />
					</Button>
				</Tooltip>
			</div>
		</footer>
	);
}
