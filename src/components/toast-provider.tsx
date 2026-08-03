import { Toast } from "@base-ui/react/toast";
import { XIcon } from "@phosphor-icons/react";
import { createContext, type ReactNode, useContext } from "react";

interface ToastOptions {
	title: string;
	description?: string;
	type?: "success" | "error" | "warning" | "info";
}

const ToastContext = createContext<{
	add: (options: ToastOptions) => void;
} | null>(null);

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within ToastProvider");
	return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
	return (
		<Toast.Provider>
			<ToastInner>{children}</ToastInner>
		</Toast.Provider>
	);
}

const TOAST_ACCENT_CLASS: Record<string, { border: string; text: string }> = {
	success: { border: "blc-diff-add", text: "c-diff-add" },
	error: { border: "blc-diff-remove", text: "c-diff-remove" },
	warning: { border: "blc-warning", text: "c-warning" },
	info: { border: "blc-accent", text: "c-accent" },
};

function toastAccentClass(type: string | undefined) {
	return TOAST_ACCENT_CLASS[type ?? "info"] ?? TOAST_ACCENT_CLASS.info;
}

function ToastItem({ toast }: { toast: Toast.Root.ToastObject }) {
	const accent = toastAccentClass(toast.type);

	return (
		<Toast.Root
			toast={toast}
			className={`toast-root btw-1 brw-1 bbw-1 blw-3 p-r d-f fd-c g-1 w-72 pl-4 pr-8 py-3 bs-s bc-border bg-surface bs-o-xs ${accent.border}`}
		>
			<Toast.Title className={`ff-m fs-sm fw-700 ${accent.text}`}>
				{toast.title}
			</Toast.Title>
			{toast.description && (
				<Toast.Description className="ff-m fs-xs c-accent-dim">
					{toast.description}
				</Toast.Description>
			)}
			<Toast.Close
				aria-label="Dismiss"
				className="p-a t-2 r-2 d-f ai-c jc-c w-5 h-5 bg-transparent bw-0 p-0 c-p c-accent-dim h:c-accent fv:os-s fv:oo-2 fv:oc-accent"
			>
				<XIcon size={12} weight="bold" />
			</Toast.Close>
		</Toast.Root>
	);
}

function ToastInner({ children }: { children: ReactNode }) {
	const { add, toasts } = Toast.useToastManager();

	return (
		<ToastContext.Provider value={{ add }}>
			{children}
			<Toast.Viewport className="p-f t-12 l-50% ttx--half @lg:ml--36 zi-60 d-f fd-c g-2">
				{toasts.map((toast) => (
					<ToastItem key={toast.id} toast={toast} />
				))}
			</Toast.Viewport>
		</ToastContext.Provider>
	);
}
