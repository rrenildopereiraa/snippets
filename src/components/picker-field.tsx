import { Select } from "@base-ui/react/select";
import { CaretDownIcon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { Tooltip } from "./tooltip";

export interface PickerOption<T extends string> {
	id: T;
	label: string;
	style?: CSSProperties;
}

export function PickerField<T extends string>({
	label,
	value,
	options,
	onValueChange,
	badge,
}: {
	label?: string;
	value: T;
	options: PickerOption<T>[];
	onValueChange: (value: T) => void;
	badge?: { text: string; title: string };
}) {
	const selected = options.find((option) => option.id === value);

	return (
		<div className="d-f fd-c g-1 px-2 pb-4">
			{label && (
				<span className="fs-sm ff-m us-none c-accent-dim">{label}</span>
			)}
			<Select.Root
				value={value}
				onValueChange={(next) => {
					if (next) onValueChange(next as T);
				}}
			>
				<Select.Trigger className="d-f ai-c jc-sb g-1 w-100% px-2 py-1 fs-sm ff-m us-none c-p bw-1 bs-s bs-i-xs c-accent-dim bc-border bg-page fv:os-s fv:oo-2 fv:oc-accent">
					<Select.Value>
						{() => (
							<span className="min-w-0 o-h to-e ws-nw">
								{selected?.label ?? value}
								{badge && (
									<Tooltip content={badge.title}>
										<span className="c-accent"> {badge.text}</span>
									</Tooltip>
								)}
							</span>
						)}
					</Select.Value>
					<Select.Icon className="d-f c-accent-dim">
						<CaretDownIcon size={12} weight="fill" />
					</Select.Icon>
				</Select.Trigger>
				<Select.Portal>
					<Select.Positioner
						sideOffset={8}
						alignItemWithTrigger={false}
						className="zi-90 p-0 ow-0 us-none"
					>
						<Select.Popup className="select-popup w-48 bw-1 py-1 bs-o-xs bc-border bg-surface">
							<Select.List>
								{options.map((option) => (
									<Select.Item
										key={option.id}
										value={option.id}
										className={(state) =>
											`d-f ai-c jc-sb g-2 mx-1 px-3 py-2 fs-sm ff-m us-none c-p ${
												state.highlighted
													? "bg-accent c-on-accent"
													: state.selected
														? "c-accent fw-700 tdl-u"
														: "c-accent-dim"
											}`
										}
									>
										<Select.ItemText>
											<span style={option.style}>{option.label}</span>
										</Select.ItemText>
									</Select.Item>
								))}
							</Select.List>
						</Select.Popup>
					</Select.Positioner>
				</Select.Portal>
			</Select.Root>
		</div>
	);
}
