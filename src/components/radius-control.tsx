import { Button } from "@base-ui/react/button";
import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import { CaretUpIcon, CornersOutIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { CornerRadii } from "../lib/types";

export const RADIUS_MIN = 0;
export const RADIUS_MAX = 16;

const CORNERS: {
	id: keyof CornerRadii;
	label: string;
	Icon: typeof CaretUpIcon;
	rotate: string;
}[] = [
	{ id: "tl", label: "Top left", Icon: CaretUpIcon, rotate: "ro-63" },
	{ id: "tr", label: "Top right", Icon: CaretUpIcon, rotate: "ro--63" },
	{ id: "bl", label: "Bottom left", Icon: CaretUpIcon, rotate: "ro--27" },
	{ id: "br", label: "Bottom right", Icon: CaretUpIcon, rotate: "ro-27" },
];

export function RadiusControl({
	radii,
	onRadiiChange,
}: {
	radii: CornerRadii;
	onRadiiChange: (value: CornerRadii) => void;
}) {
	const [split, setSplit] = useState(false);

	const values = [radii.tl, radii.tr, radii.bl, radii.br];
	const uniform = values.every((value) => value === values[0]);

	function setAll(value: number) {
		onRadiiChange({ tl: value, tr: value, bl: value, br: value });
	}

	function setCorner(corner: keyof CornerRadii, value: number) {
		onRadiiChange({ ...radii, [corner]: value });
	}

	return (
		<div className="d-f fd-c g-2 px-2 pt-1 pb-4">
			<div className="d-f jc-sb ai-c">
				<span className="fs-sm ff-m us-none c-accent-dim">Border Radius</span>
				<span className="fs-sm ff-m us-none c-accent-dim">
					{uniform ? `${radii.tl}px` : "Mixed"}
				</span>
			</div>

			<Slider.Root
				value={uniform ? radii.tl : Math.max(...values)}
				onValueChange={(value) => setAll(value)}
				min={RADIUS_MIN}
				max={RADIUS_MAX}
				step={1}
			>
				<Slider.Control className="d-f ai-c py-3 us-none ta-none">
					<Slider.Track className="p-r h-2 w-100% bg-border">
						<Slider.Indicator className="bg-accent" />
						<Slider.Thumb className="w-6 h-4 bw-1 bs-s bs-o-xs bg-page bc-border fv:os-s fv:oo-2 fv:oc-accent" />
					</Slider.Track>
				</Slider.Control>
			</Slider.Root>

			<Button
				onClick={() => setSplit((value) => !value)}
				aria-pressed={split}
				className={`d-f ai-c jc-c as-s g-1 px-2 py-1 fs-xs ff-m us-none c-p bw-1 bs-s fv:os-s fv:oo-2 fv:oc-accent ${
					split
						? "bg-accent bc-accent c-on-accent"
						: "bg-transparent bc-border c-accent-dim h:bc-accent h:c-accent"
				}`}
			>
				<CornersOutIcon size={12} weight="bold" />
				Per-corner
			</Button>

			{split && (
				<div className="d-g gtc-2 g-1">
					{CORNERS.map(({ id, label, Icon, rotate }) => (
						<div key={id} className="d-f bw-1 bs-s bc-border">
							<span className="d-f ai-c jc-c w-6 fs-0 brw-1 bs-s c-accent-dim bc-border">
								<Icon size={12} weight="bold" aria-hidden className={rotate} />
							</span>
							<NumberField.Root
								value={radii[id]}
								onValueChange={(value) => {
									if (value != null) setCorner(id, value);
								}}
								min={RADIUS_MIN}
								max={RADIUS_MAX}
								step={1}
								aria-label={`${label} radius`}
								className="f-1"
							>
								<NumberField.Input className="ff-m fs-sm bs-i-xs bw-0 px-1 py-1 w-100% ta-c c-accent-dim bg-page" />
							</NumberField.Root>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
