/** Inline SVG only — never emoji as structural icons. One family, 1.5px stroke,
 *  sized by the `size` prop so callers stay on the icon scale. */

interface Props {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false as const,
});

export const ChevronDown = ({ size = 14, className }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M4 6.5 8 10.5l4-4" />
  </svg>
);

export const ChevronUp = ({ size = 14, className }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M4 9.5 8 5.5l4 4" />
  </svg>
);

export const Close = ({ size = 14, className }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
  </svg>
);

