import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement } from "react";

const ARROW_SIZE = 5;

export function Tooltip({
	content,
	children,
}: {
	content: string;
	children: ReactElement;
}) {
	return (
		<BaseTooltip.Root>
			<BaseTooltip.Trigger render={children} />
			<BaseTooltip.Portal>
				<BaseTooltip.Positioner sideOffset={6} className="zi-90">
					<BaseTooltip.Popup className="tooltip-popup p-r px-2 py-1 bw-1 bs-s bc-border bg-surface c-accent-dim fs-xs ff-m us-none bs-o-xs">
						{/* Square-tipped arrow to match the app's flat, un-rounded
						    controls - the reference version uses a rounded popup.
						    Rotated per side so the tip always points at the anchor
						    when the tooltip flips. */}
						<BaseTooltip.Arrow
							className="d-f"
							style={(state) => ({
								// Base UI only positions the arrow along the cross axis;
								// the side offset (pushing it outside the popup edge) and
								// the rotation are ours to set. ARROW_SIZE is the svg's
								// own height, so its flat base lands flush on the border.
								rotate:
									state.side === "top"
										? "0deg"
										: state.side === "bottom"
											? "180deg"
											: state.side === "left"
												? "-90deg"
												: "90deg",
								...(state.side === "top"
									? { bottom: -ARROW_SIZE }
									: state.side === "bottom"
										? { top: -ARROW_SIZE }
										: state.side === "left"
											? { right: -ARROW_SIZE }
											: { left: -ARROW_SIZE }),
							})}
						>
							<svg
								viewBox="0 0 10 5"
								width={ARROW_SIZE * 2}
								height={ARROW_SIZE}
								aria-hidden="true"
							>
								<path
									d="M0 0 L5 5 L10 0"
									className="f-surface s-border"
									strokeWidth="1"
								/>
							</svg>
						</BaseTooltip.Arrow>
						{content}
					</BaseTooltip.Popup>
				</BaseTooltip.Positioner>
			</BaseTooltip.Portal>
		</BaseTooltip.Root>
	);
}
