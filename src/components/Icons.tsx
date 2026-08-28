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

export const Check = ({ size = 14, className }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
);

export const Pin = ({ size = 14, className }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M6 2h4l-.5 4.2 2 2.3H4.5l2-2.3L6 2Z" />
    <path d="M8 8.5V14" />
  </svg>
);

export const Plus = ({ size = 14, className }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M8 3.5v9M3.5 8h9" />
  </svg>
);

export const Grip = ({ size = 14, className }: Props) => (
  <svg {...base(size)} className={className} strokeWidth={0} fill="currentColor">
    <circle cx="6" cy="4" r="1" />
    <circle cx="10" cy="4" r="1" />
    <circle cx="6" cy="8" r="1" />
    <circle cx="10" cy="8" r="1" />
    <circle cx="6" cy="12" r="1" />
    <circle cx="10" cy="12" r="1" />
  </svg>
);

export const Link = ({ size = 14, className }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M9 3.5h3.5V7" />
    <path d="M12.5 3.5 7.5 8.5" />
    <path d="M11.5 9.5v2a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h2" />
  </svg>
);

export const Inbox = ({ size = 14, className }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M2 9.5h3l1 2h4l1-2h3" />
    <path d="M3.5 3.5h9l1.5 6v3a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-3l1.5-6Z" />
  </svg>
);
