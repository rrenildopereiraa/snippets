import react from "@vitejs/plugin-react";
import yummacss from "@yummacss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		react(),
		yummacss(),
		VitePWA({
			registerType: "autoUpdate",
			workbox: {
				maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
			},
			manifest: {
				name: "Snippets",
				short_name: "Snippets",
				description: "Beautiful code screenshots.",
				start_url: "/",
				display: "standalone",
				background_color: "#ffffff",
				theme_color: "#2563eb",
				icons: [
					{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
					{ src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
				],
			},
		}),
	],
});
