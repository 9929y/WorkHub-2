import type { Status } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";

/** Status indicator.
 *
 *  Each status has its own **glyph shape**, not just a hue. The palette spans the
 *  red/green pair, so hue alone would collapse under deuteranopia; the shape makes
 *  status readable in greyscale, and the label makes it readable to assistive tech.
 *
 *    running  filled disc      done  check
 *    blocked  cross            waiting  hollow ring
 */
const GLYPH: Record<Status, React.ReactNode> = {
  running: <circle cx="5" cy="5" r="3.1" fill="currentColor" />,
  done: (
    <path
      d="M1.9 5.2 4.1 7.4 8.1 2.9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  blocked: (
    <path
      d="M2.3 2.3 7.7 7.7M7.7 2.3 2.3 7.7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  ),
  waiting: <circle cx="5" cy="5" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.8" />,
};

export function StatusDot({ status, size = 10 }: { status: Status; size?: number }) {
  return (
    <svg
      className={`glyph glyph-${status}`}
      width={size}
      height={size}
      viewBox="0 0 10 10"
      role="img"
      aria-label={STATUS_LABEL[status]}
    >
      <title>{STATUS_LABEL[status]}</title>
      {GLYPH[status]}
    </svg>
  );
}

export function StatusChip({ status }: { status: Status }) {
  return (
    <span className={`chip chip-${status}`}>
      <StatusDot status={status} size={9} />
      {STATUS_LABEL[status]}
    </span>
  );
}
