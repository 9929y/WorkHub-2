/** Platform marks: the products' own logos.
 *
 *  Paths come from `simple-icons`, which ships the official single-path marks,
 *  so these are the real logos rather than something drawn to resemble them.
 *
 *  They render **monochrome, tinted to the current text colour**, which is how
 *  simple-icons is meant to be used and the only thing that survives both
 *  themes: Cursor's brand colour is #000000 and GitHub's is #181717, both
 *  invisible on a dark panel. Recognition comes from the shape. Status is not
 *  carried here at all: it lives on the separate status glyph, so a logo never
 *  has to mean two things at once.
 *
 *  OpenAI is deliberately absent. simple-icons removed that mark at OpenAI's
 *  request, so Codex falls back to a lettermark rather than an invented logo.
 */

import {
  siAnthropic,
  siClaude,
  siCursor,
  siFigma,
  siGithub,
  siGooglecloud,
  siLinear,
  siNotion,
  siVercel,
} from "simple-icons";

type Mark = { path: string; title: string };

const BRANDS: Record<string, Mark> = {
  cursor: siCursor,
  figma: siFigma,
  github: siGithub,
  claude: siClaude,
  "claude code": siClaude,
  anthropic: siAnthropic,
  cloud: siGooglecloud,
  "google cloud": siGooglecloud,
  gcp: siGooglecloud,
  vercel: siVercel,
  notion: siNotion,
  linear: siLinear,
};

/** Two letters, because Cursor and Codex collide on their first. */
function initials(name: string): string {
  const clean = name.trim();
  if (!clean) return "?";
  const words = clean.split(/[\s_-]+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function PlatformIcon({ sourceApp, size = 16 }: { sourceApp: string; size?: number }) {
  const brand = BRANDS[sourceApp.trim().toLowerCase()];

  if (brand) {
    return (
      <svg
        className="logo"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label={sourceApp}
      >
        <title>{sourceApp}</title>
        <path d={brand.path} fill="currentColor" />
      </svg>
    );
  }

  return (
    <span className="logo logo-text" style={{ width: size, height: size, fontSize: size * 0.46 }} aria-label={sourceApp}>
      {initials(sourceApp)}
    </span>
  );
}
