import type { Status } from "../lib/types";
import { KNOWN_SOURCE_APPS, STATUS_LABEL } from "../lib/types";
import { StatusDot } from "./StatusDot";

/** A source app plus that app's current status inside the project.
 *  Unknown apps render neutral rather than being rejected, so a new adapter
 *  works without a frontend change. */
export function SourceBadge({ sourceApp, status }: { sourceApp: string; status: Status }) {
  const known = (KNOWN_SOURCE_APPS as readonly string[]).includes(sourceApp);
  return (
    <span
      className={`badge${known ? "" : " badge-unknown"}`}
      title={`${sourceApp} — ${STATUS_LABEL[status]}`}
    >
      <StatusDot status={status} size={6} />
      {sourceApp}
    </span>
  );
}
