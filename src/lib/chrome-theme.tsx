import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

export type ChromeMode = "light" | "dark" | "auto";

// The frame's own light/dark preference. "auto" keeps the frame following
// the app scheme; light/dark force the code block's appearance regardless
// of how the app itself is themed.
export type FrameMode = "light" | "dark" | "auto";

// The concrete scheme once "auto" is resolved against the operating
// system - JS-driven consumers (the exported code frame) need a definite
// scheme, CSS consumers just inherit `color-scheme` instead.
export type ResolvedMode = "light" | "dark";

const STORAGE_KEY = "snippets.renildo.dev-chrome-mode";

// Yumma CSS color-scheme utilities: `cs-l`/`cs-d` force a scheme, `cs-ld`
// follows the operating system. Applied to <html> so Base UI portals
// (tooltips, pickers, dialogs) inherit the scheme too.
const MODE_CLASS: Record<ChromeMode, string> = {
	light: "cs-l",
	dark: "cs-d",
	auto: "cs-ld",
};

function readStoredMode(): ChromeMode {
	if (typeof window === "undefined") return "auto";
	const stored = window.localStorage.getItem(STORAGE_KEY);
	return stored === "light" || stored === "dark" ? stored : "auto";
}

function applyModeClass(mode: ChromeMode) {
	const root = document.documentElement;
	root.classList.remove("cs-l", "cs-d", "cs-ld");
	root.classList.add(MODE_CLASS[mode]);
}

function readOsMode(): ResolvedMode {
	if (typeof window === "undefined") return "dark";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

// Called once before the first render so the initial paint already carries
// the stored scheme - waiting for the provider's effect would flash the OS
// scheme for users with a stored override.
export function initChromeMode() {
	applyModeClass(readStoredMode());
}

const ChromeThemeContext = createContext<{
	mode: ChromeMode;
	resolvedMode: ResolvedMode;
	setMode: (mode: ChromeMode) => void;
	cycleMode: () => void;
} | null>(null);

export function useChromeTheme() {
	const ctx = useContext(ChromeThemeContext);
	if (!ctx) {
		throw new Error("useChromeTheme must be used within ChromeThemeProvider");
	}
	return ctx;
}

const CYCLE: ChromeMode[] = ["light", "dark", "auto"];

export function ChromeThemeProvider({ children }: { children: ReactNode }) {
	const [mode, setMode] = useState<ChromeMode>(readStoredMode);
	const [osMode, setOsMode] = useState<ResolvedMode>(readOsMode);

	useEffect(() => {
		window.localStorage.setItem(STORAGE_KEY, mode);
		applyModeClass(mode);
	}, [mode]);

	useEffect(() => {
		const query = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => setOsMode(query.matches ? "dark" : "light");
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);

	const cycleMode = () =>
		setMode((current) => CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]);

	return (
		<ChromeThemeContext.Provider
			value={{
				mode,
				resolvedMode: mode === "auto" ? osMode : mode,
				setMode,
				cycleMode,
			}}
		>
			{children}
		</ChromeThemeContext.Provider>
	);
}
