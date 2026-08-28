import type { Status } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";

/** Status is never conveyed by colour alone — the dot always carries an
 *  accessible label, and running additionally pulses. */
export function StatusDot({ status, size = 7 }: { status: Status; size?: number }) {
  return (
    <span
      className={`dot dot-${status}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={STATUS_LABEL[status]}
      title={STATUS_LABEL[status]}
    />
  );
}

export function StatusChip({ status }: { status: Status }) {
  return (
    <span className={`chip chip-${status}`}>
      <StatusDot status={status} size={6} />
      {STATUS_LABEL[status]}
    </span>
  );
}
