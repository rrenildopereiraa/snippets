import { Select } from "@base-ui/react/select";
import { CaretDownIcon } from "@phosphor-icons/react";
import { LANGUAGES, type LanguageId } from "../lib/highlighter";

const SHORT_LABELS: Record<LanguageId, string> = {
	html: "HTML",
	javascript: "JS",
	mjs: "MJS",
	jsx: "JSX",
	typescript: "TS",
	tsx: "TSX",
	astro: "ASTRO",
	vue: "VUE",
	svelte: "SVELTE",
	markdown: "MD",
	mdx: "MDX",
	css: "CSS",
	scss: "SCSS",
	php: "PHP",
};

const options = Object.entries(LANGUAGES).map(([id, label]) => ({
	id: id as LanguageId,
	label,
}));

export function LanguagePicker({
	value,
	onValueChange,
}: {
	value: LanguageId;
	onValueChange: (value: LanguageId) => void;
}) {
	return (
		<Select.Root
			value={value}
			onValueChange={(next) => {
				if (next) onValueChange(next);
			}}
		>
			<Select.Trigger className="d-f ai-c jc-sb g-1 px-3 py-1 bg-transparent c-accent-dim h:c-accent h:bg-page fs-xs ff-m us-none c-p bw-0 fv:os-s fv:oo--2 fv:oc-accent">
				<Select.Value>
					{() => (
						<span className="d-if w-12 ta-c o-h to-e ws-nw">
							{SHORT_LABELS[value]}
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
					<Select.Popup className="select-popup w-40 max-h-40 oy-auto bw-1 py-1 bs-o-xs bc-border bg-surface">
						<Select.List className="p-r o-auto">
							{options.map(({ id, label }) => (
								<Select.Item
									key={id}
									value={id}
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
									<Select.ItemText>{label}</Select.ItemText>
								</Select.Item>
							))}
						</Select.List>
					</Select.Popup>
				</Select.Positioner>
			</Select.Portal>
		</Select.Root>
	);
}
