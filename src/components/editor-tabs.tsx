import { Button } from "@base-ui/react/button";
import {
	CheckIcon,
	ClipboardIcon,
	ClipboardTextIcon,
	FileCodeIcon,
	GithubLogoIcon,
	LinkSimpleIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { modKey } from "../lib/platform";
import { type EditorDocument, MAX_DOCUMENTS } from "../lib/types";
import { ExportButton } from "./export-button";
import type { ExportFormat } from "./format-picker";
import { Tooltip } from "./tooltip";

const GITHUB_URL = "https://github.com/rrenildopereiraa/prisharp";

function TabItem({
	doc,
	isActive,
	canClose,
	onSelect,
	onClose,
}: {
	doc: EditorDocument;
	isActive: boolean;
	canClose: boolean;
	onSelect: (id: string) => void;
	onClose: (id: string) => void;
}) {
	return (
		<div
			className={`d-f ai-c g-2 pl-3 pr-2 py-2 brw-1 bs-s bc-border c-p o-h h:bg-page ${isActive ? "bg-page" : ""}`}
		>
			<button
				type="button"
				onClick={() => onSelect(doc.id)}
				className="d-f ai-c g-2 p-0 bg-transparent bw-0 us-none c-p fv:os-s fv:oo-2 fv:oc-accent f-1 ws-nw"
			>
				<FileCodeIcon
					size={14}
					weight="fill"
					className={isActive ? "c-accent" : "c-accent-dim"}
				/>
				<span className="fs-sm ff-m ws-nw c-accent-dim">
					{doc.fileName || "Untitled"}
				</span>
			</button>
			{canClose && (
				<Tooltip content="Close snippet">
					<button
						type="button"
						onClick={() => onClose(doc.id)}
						aria-label="Close snippet"
						className="d-f ai-c jc-c p-0 bg-transparent bw-0 c-p c-accent-dim h:c-accent fv:os-s fv:oo-2 fv:oc-accent"
					>
						<XIcon size={12} weight="bold" />
					</button>
				</Tooltip>
			)}
		</div>
	);
}

export function EditorTabBar({
	documents,
	activeId,
	onSelect,
	onClose,
	onAdd,
	onOpenPalette,
	onCopy,
	onExport,
	onShare,
	exporting,
	format,
	onFormatChange,
}: {
	documents: EditorDocument[];
	activeId: string;
	onSelect: (id: string) => void;
	onClose: (id: string) => void;
	onAdd: () => void;
	onOpenPalette: () => void;
	onCopy: () => void;
	onExport: () => void;
	onShare: () => void;
	exporting: boolean;
	format: ExportFormat;
	onFormatChange: (value: ExportFormat) => void;
}) {
	const [copied, setCopied] = useState(false);
	const [shared, setShared] = useState(false);
	const canClose = documents.length > 1;
	const atLimit = documents.length >= MAX_DOCUMENTS;

	return (
		<header className="d-f p-st t-0 zi-10 bbw-1 bs-s bc-border bg-surface">
			<div className="d-f ai-c g-2 px-3 py-2 brw-1 bs-s bc-border">
				<svg
					width="22"
					height="22"
					viewBox="0 0 100 100"
					aria-hidden="true"
					className="fs-0"
				>
					<polygon
						points="50,18 78,50 50,82 22,50"
						fill="#2563eb"
						stroke="#1d4ed8"
						strokeWidth="1"
					/>
					<polygon points="50,18 64,50 50,82" fill="#93b4f5" />
				</svg>
				<span className="fs-sm ff-m fw-700 us-none ws-nw c-accent-dim">
					Pri<span className="c-accent">sharp</span>
				</span>
			</div>

			<div className="d-none @lg:d-f min-w-0 o-x-auto">
				{documents.map((doc) => (
					<TabItem
						key={doc.id}
						doc={doc}
						isActive={doc.id === activeId}
						canClose={canClose}
						onSelect={onSelect}
						onClose={onClose}
					/>
				))}

				<Tooltip
					content={
						atLimit ? `Snippet limit reached (${MAX_DOCUMENTS})` : "New snippet"
					}
				>
					<button
						type="button"
						onClick={onAdd}
						aria-label={
							atLimit
								? `Snippet limit reached (${MAX_DOCUMENTS})`
								: "New snippet"
						}
						style={{ opacity: atLimit ? 0.4 : undefined }}
						className="d-f ai-c jc-c as-s w-8 brw-1 bs-s bc-border bg-transparent c-accent-dim h:c-accent h:bg-page c-p fv:os-s fv:oo--2 fv:oc-accent"
					>
						<PlusIcon size={14} weight="bold" />
					</button>
				</Tooltip>
			</div>

			<div className="f-1" />

			<div className="d-f ai-c g-1 px-2">
				<Tooltip content="View source on GitHub">
					<a
						href={GITHUB_URL}
						target="_blank"
						rel="noreferrer"
						aria-label="View source on GitHub"
						className="d-f ai-c jc-c w-7 h-7 bg-transparent td-none c-p c-accent-dim h:c-accent fv:os-s fv:oo-2 fv:oc-accent"
					>
						<GithubLogoIcon size={16} weight="fill" />
					</a>
				</Tooltip>

				<Button
					onClick={onOpenPalette}
					aria-label="Search commands"
					className="d-none @lg:d-f ai-c jc-c g-2 h-7 px-3 bw-1 fs-xs ff-m us-none c-p bs-i-xs bg-page bc-border c-accent-dim h:c-accent fv:os-s fv:oo-2 fv:oc-accent"
				>
					<MagnifyingGlassIcon size={12} weight="bold" />
					Search
					<span className="px-1 bw-1 bs-s fs-xs ws-nw bc-border c-accent-dim">
						{modKey}K
					</span>
				</Button>

				<Button
					onClick={() => {
						onShare();
						setShared(true);
						setTimeout(() => setShared(false), 1500);
					}}
					className="d-f ai-c jc-c g-2 w-8 @lg:w-24 h-7 px-2 bg-transparent bw-1 bs-i-xs us-none c-p bc-border c-accent-dim h:c-accent h:bg-page fv:os-s fv:oo-2 fv:oc-accent"
				>
					{shared ? (
						<CheckIcon size={14} weight="bold" className="c-diff-add" />
					) : (
						<LinkSimpleIcon size={14} />
					)}
					<span className="d-none @lg:d-if">{shared ? "Copied" : "Share"}</span>
				</Button>

				<Button
					onClick={() => {
						onCopy();
						setCopied(true);
						setTimeout(() => setCopied(false), 1500);
					}}
					className="d-f ai-c jc-c g-2 w-8 @lg:w-24 h-7 px-2 bg-transparent bw-1 bs-i-xs us-none c-p bc-border c-accent-dim h:c-accent h:bg-page fv:os-s fv:oo-2 fv:oc-accent"
				>
					{copied ? (
						<ClipboardTextIcon size={14} weight="fill" className="c-diff-add" />
					) : (
						<ClipboardIcon size={14} weight="fill" />
					)}
					<span className="d-none @lg:d-if">{copied ? "Copied" : "Copy"}</span>
				</Button>

				<ExportButton
					exporting={exporting}
					onExport={onExport}
					format={format}
					onFormatChange={onFormatChange}
				/>
			</div>
		</header>
	);
}
