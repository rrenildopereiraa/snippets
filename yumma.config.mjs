import { defineConfig } from "yummacss";

export default defineConfig({
	source: ["./src/**/*.{ts,tsx}"],
	// Classes only ever referenced inside conditional expressions; the
	// scanner can't reliably see those, so force-generate them.
	safelist: [
		"tp-d",
		"tdu-200",
		"tp-t",
		"tor-c",
		"o-40",
		"o-50",
		"bg-accent-dim",
		"ttx-0",
		"ttx-3",
	],
	theme: {
		colors: {
			accent: { light: "#2563eb", dark: "#bec6f2" },
			"accent-dim": { light: "#64748b", dark: "#b9bed5" },
			"on-accent": { light: "#ffffff", dark: "#21243f" },
			border: { light: "#cbd5e1", dark: "#31365e" },
			code: "#2563eb",
			page: { light: "#ffffff", dark: "#21243f" },
			surface: { light: "#f1f5f9", dark: "#1e2039" },
			"diff-add": "#86efac",
			"diff-remove": "#fca5a5",
			warning: "#fcd34d",
		},
	},
});
