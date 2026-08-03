import { NuqsAdapter } from "nuqs/adapters/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ToastProvider } from "./components/toast-provider.tsx";
import { ChromeThemeProvider, initChromeMode } from "./lib/chrome-theme.tsx";

initChromeMode();

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
createRoot(root).render(
	<StrictMode>
		<NuqsAdapter>
			<ChromeThemeProvider>
				<ToastProvider>
					<App />
				</ToastProvider>
			</ChromeThemeProvider>
		</NuqsAdapter>
	</StrictMode>,
);
