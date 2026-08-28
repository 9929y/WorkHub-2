/** Platform marks. These replace the words "Cursor" / "Codex" / "Figma".
 *
 *  Deliberately generic geometry, not brand logos: a pointer for Cursor, a
 *  terminal prompt for Codex, overlapping shapes for a design tool, a cloud for
 *  remote jobs. Trademarked marks are not ours to redraw, and an unknown
 *  platform must still render something, so the fallback is a lettermark.
 *
 *  The name is never drawn; it lives in the tooltip and the accessible label. */

const MARKS: Record<string, React.ReactNode> = {
  cursor: <path d="M4 3.2 12 8.6l-3.4.6L7 12.6 4 3.2Z" fill="currentColor" />,
  codex: (
    <>
      <path d="M4.4 5.6 6.7 8l-2.3 2.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.4 10.9h3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  figma: (
    <>
      <rect x="3.1" y="3.1" width="6" height="6" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10.2" cy="10.2" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  cloud: (
    <path
      d="M5 11.4h5.6a2.4 2.4 0 0 0 .3-4.8 3.4 3.4 0 0 0-6.5-.5A2.65 2.65 0 0 0 5 11.4Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  claude: (
    <path d="M8 2.6 9.6 6.4 13.4 8l-3.8 1.6L8 13.4 6.4 9.6 2.6 8l3.8-1.6L8 2.6Z" fill="currentColor" />
  ),
  github: (
    <path
      d="M8 2.4a5.6 5.6 0 0 0-1.8 10.9c.3.05.4-.12.4-.27v-1.05c-1.6.34-1.9-.68-1.9-.68-.26-.66-.64-.83-.64-.83-.52-.36.04-.35.04-.35.58.04.88.6.88.6.51.88 1.35.63 1.68.48.05-.37.2-.63.36-.77-1.28-.15-2.62-.64-2.62-2.84 0-.63.22-1.14.59-1.54-.06-.15-.26-.73.06-1.52 0 0 .48-.16 1.58.59a5.4 5.4 0 0 1 2.88 0c1.1-.75 1.58-.59 1.58-.59.32.79.12 1.37.06 1.52.37.4.59.91.59 1.54 0 2.2-1.34 2.69-2.62 2.83.21.18.39.53.39 1.07v1.58c0 .15.1.33.4.27A5.6 5.6 0 0 0 8 2.4Z"
      fill="currentColor"
    />
  ),
};

/** Codex and Cursor both start with C, so a first-letter fallback would collide.
 *  Unknown platforms get their initial in a ring, which reads as "not one of
 *  the known four" rather than pretending to be one. */
function Fallback({ name }: { name: string }) {
  return (
    <>
      <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.55" />
      <text
        x="8"
        y="8"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="7"
        fontWeight="700"
        fill="currentColor"
        fontFamily="-apple-system, sans-serif"
      >
        {(name.trim()[0] ?? "?").toUpperCase()}
      </text>
    </>
  );
}

export function PlatformIcon({ sourceApp, size = 16 }: { sourceApp: string; size?: number }) {
  const key = sourceApp.trim().toLowerCase();
  const mark = MARKS[key] ?? (key.includes("claude") ? MARKS.claude : undefined);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden focusable={false}>
      {mark ?? <Fallback name={sourceApp} />}
    </svg>
  );
}
