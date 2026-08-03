import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@base-ui/react/input";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export interface Command {
	id: string;
	label: string;
	kbd?: string;
	run: () => void;
}

export function CommandPalette({
	open,
	onOpenChange,
	commands,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	commands: Command[];
}) {
	const [query, setQuery] = useState("");
	const [highlighted, setHighlighted] = useState(0);

	const matches = commands.filter((command) =>
		command.label.toLowerCase().includes(query.toLowerCase()),
	);

	// Reset the search whenever the palette opens fresh.
	useEffect(() => {
		if (open) {
			setQuery("");
			setHighlighted(0);
		}
	}, [open]);

	// Keep the keyboard-highlighted row visible as arrow keys move past
	// the visible edge of the scrollable list.
	// biome-ignore lint/correctness/useExhaustiveDependencies: highlighted is the scroll trigger, read from the DOM
	useEffect(() => {
		document
			.querySelector("[data-palette-highlighted]")
			?.scrollIntoView({ block: "nearest" });
	}, [highlighted]);

	function runCommand(command: Command) {
		onOpenChange(false);
		command.run();
	}

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal keepMounted>
				<Dialog.Backdrop className="p-f i-0 zi-80 bg-page/60" />
				<Dialog.Popup className="p-f t-24 l-50% ttx--half zi-90 w-112 max-w-100% bw-1 bs-s bc-border bg-surface bs-o-xs">
					<div className="d-f ai-c g-2 px-3 py-2 bbw-1 bs-s bc-border">
						<MagnifyingGlassIcon size={14} className="c-accent-dim" />
						<Input
							autoFocus
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
								setHighlighted(0);
							}}
							onKeyDown={(event) => {
								if (event.key === "ArrowDown") {
									event.preventDefault();
									setHighlighted((index) =>
										Math.min(index + 1, matches.length - 1),
									);
								} else if (event.key === "ArrowUp") {
									event.preventDefault();
									setHighlighted((index) => Math.max(index - 1, 0));
								} else if (event.key === "Enter" && matches[highlighted]) {
									event.preventDefault();
									runCommand(matches[highlighted]);
								}
							}}
							placeholder="Search commands..."
							className="f-1 ff-m fs-sm bg-transparent bs-s os-none p-0 c-accent"
						/>
					</div>

					<div className="py-1 max-h-80 oy-auto">
						{matches.length === 0 && (
							<div className="px-3 py-2 ff-m fs-sm c-accent-dim">
								No commands found
							</div>
						)}
						{matches.map((command, index) => (
							<Button
								key={command.id}
								onClick={() => runCommand(command)}
								onMouseEnter={() => setHighlighted(index)}
								data-palette-highlighted={
									index === highlighted ? "" : undefined
								}
								className={`d-f ai-c jc-sb g-2 w-100% px-3 py-2 fs-sm ff-m ta-l us-none c-p bw-0 ${
									index === highlighted
										? "bg-accent c-on-accent"
										: "bg-transparent c-accent-dim"
								}`}
							>
								<span>{command.label}</span>
								{command.kbd && (
									<span
										className={`px-1 bw-1 bs-s fs-xs ws-nw bc-border ${
											index === highlighted ? "c-on-accent" : "c-accent-dim"
										}`}
									>
										{command.kbd}
									</span>
								)}
							</Button>
						))}
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
