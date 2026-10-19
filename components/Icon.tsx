import type { ReactNode } from "react";

/** The icon set of the approved design, drawn on a 24 x 24 grid. */
export type IconName =
  | "compass"
  | "sun"
  | "lock"
  | "chevronDown"
  | "chevronUp"
  | "external"
  | "warning"
  | "document"
  | "home"
  | "chart"
  | "table"
  | "shield"
  | "chat"
  | "compare"
  | "guide"
  | "search"
  | "print"
  | "whatsapp"
  | "download"
  | "upload"
  | "back"
  | "check"
  | "cross"
  | "clock"
  | "copy";

const SHAPES: Record<IconName, ReactNode> = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z" fill="currentColor" stroke="none" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronUp: <path d="M6 15l6-6 6 6" />,
  external: <path d="M7 17L17 7M8 7h9v9" />,
  warning: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18h.01" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  home: <path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  chart: <path d="M4 19h16M4 15l5-5 4 4 7-7" />,
  table: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  shield: <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />,
  chat: (
    <>
      <path d="M4 5h16v12H8l-4 4z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  compare: (
    <>
      <rect x="3" y="4" width="8" height="16" rx="1" />
      <rect x="13" y="4" width="8" height="16" rx="1" />
    </>
  ),
  guide: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  print: (
    <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
  ),
  whatsapp: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4zm-3 4.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.2 2.4.9 2.9.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3l-2-1c-.3-.1-.5-.2-.7.2l-.9 1.1c-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.5L9.6 8.8c-.2-.4-.4-.3-.6-.3z"
    />
  ),
  download: <path d="M12 3v12M6 9l6 6 6-6M4 21h16" />,
  upload: <path d="M12 21V9M6 15l6-6 6 6M4 3h16" />,
  back: <path d="M15 6l6 6-6 6M21 12H3" transform="scale(-1,1) translate(-24,0)" />,
  check: <path d="M5 12l5 5 9-10" />,
  cross: <path d="M6 6l12 12M18 6L6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
};

const DEFAULT_STROKE = 2;

interface IconProps {
  name: IconName;
  strokeWidth?: number;
}

/** Decorative: the text next to an icon carries the meaning, so screen readers skip it. */
export function Icon({ name, strokeWidth = DEFAULT_STROKE }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[name]}
    </svg>
  );
}
