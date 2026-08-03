import { Popover } from "@base-ui/react/popover";
import { CaretDownIcon } from "@phosphor-icons/react";
import { HexColorInput, HexColorPicker } from "react-colorful";

export function ColorInput({
	label,
	value,
	onChange,
	indent,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	indent?: boolean;
}) {
	return (
		<div className={`d-f ai-c jc-sb g-2 px-2 pb-2 ${indent ? "pl-6" : ""}`}>
			<span className="d-f ai-c g-1 fs-sm ff-m us-none c-accent-dim">
				{label}
			</span>
			<div className="d-f ai-c h-7 bw-1 bs-s bg-page bc-border">
				<HexColorInput
					color={value}
					onChange={onChange}
					prefixed
					spellCheck={false}
					className="ff-m fs-sm bw-0 os-none p-0 px-2 h-100% w-20 bg-transparent c-accent-dim"
				/>
				<Popover.Root>
					<Popover.Trigger
						className="d-f ai-c jc-c h-100% w-6 bw-0 blw-1 bs-s bc-border fs-0 c-p fv:os-s fv:oo-2 fv:oc-accent"
						aria-label={`${label} color picker`}
					>
						<CaretDownIcon size={12} weight="fill" className="c-accent-dim" />
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Positioner sideOffset={8} align="end" className="zi-90">
							<Popover.Popup className="popover-popup p-2 bw-1 bs-o-xs bc-border bg-surface">
								<HexColorPicker color={value} onChange={onChange} />
							</Popover.Popup>
						</Popover.Positioner>
					</Popover.Portal>
				</Popover.Root>
			</div>
		</div>
	);
}
