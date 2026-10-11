import type { ReactNode } from 'react';

/**
 * Sketches of the browser controls the install steps point at. They use the
 * theme tokens, so they follow light and dark, and take their labels from
 * i18n. The step text says the same: they are decorative for screen readers.
 */

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 160"
      aria-hidden
      className="w-full max-w-xs rounded-2xl bg-surface text-[11px] ring-1 ring-border"
    >
      {children}
    </svg>
  );
}

/** Brand ring around the control to tap. */
function Highlight({ cx, cy, r = 15 }: { cx: number; cy: number; r?: number }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      className="fill-brand/20 stroke-brand"
      strokeWidth={2}
    />
  );
}

function PageLines({ y = 18 }: { y?: number }) {
  return (
    <g className="fill-surface-3">
      <rect x={40} y={y} width={120} height={10} rx={5} />
      <rect x={40} y={y + 18} width={240} height={8} rx={4} />
      <rect x={40} y={y + 32} width={200} height={8} rx={4} />
    </g>
  );
}

const url = 'spoticast.it';

/** Safari on iPhone: the toolbar with the Share button. */
export function IosShareIllustration() {
  return (
    <Frame>
      <PageLines />
      <rect x={0} y={84} width={320} height={76} className="fill-surface-2" />
      <rect
        x={60}
        y={94}
        width={200}
        height={24}
        rx={12}
        className="fill-surface-3"
      />
      <text x={160} y={110} textAnchor="middle" className="fill-fg-muted">
        {url}
      </text>
      <g
        className="stroke-fg-muted"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M58 132l-6 6 6 6" />
        <path d="M100 132l6 6-6 6" />
        <path d="M218 132h12v12h-12zM222 132v12" />
        <path d="M262 134h10v10h-10zM266 130h10v10" />
      </g>
      <Highlight cx={160} cy={138} />
      <g
        className="stroke-fg"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M155 136h-2v9h14v-9h-2" />
        <path d="M160 140v-12M156 132l4-4 4 4" />
      </g>
    </Frame>
  );
}

/** The iOS share sheet with "Add to Home Screen". */
export function IosAddToHomeIllustration({
  copy,
  addToHome,
}: {
  copy: string;
  addToHome: string;
}) {
  return (
    <Frame>
      <rect
        x={30}
        y={14}
        width={260}
        height={132}
        rx={16}
        className="fill-surface-2"
      />
      <rect
        x={42}
        y={26}
        width={236}
        height={34}
        rx={10}
        className="fill-surface-3"
      />
      <text x={56} y={47} className="fill-fg-muted">
        {copy}
      </text>
      <rect
        x={42}
        y={68}
        width={236}
        height={34}
        rx={10}
        className="fill-surface-3"
      />
      <rect
        x={56}
        y={81}
        width={90}
        height={8}
        rx={4}
        className="fill-border"
      />
      <rect
        x={42}
        y={110}
        width={236}
        height={30}
        rx={10}
        className="fill-brand/20 stroke-brand"
        strokeWidth={2}
      />
      <text x={56} y={129} className="fill-fg font-semibold">
        {addToHome}
      </text>
      <g
        className="stroke-fg"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      >
        <rect x={252} y={117} width={16} height={16} rx={4} />
        <path d="M260 121v8M256 125h8" />
      </g>
    </Frame>
  );
}

/** Chrome on Android: the ⋮ menu with "Install app". */
export function AndroidMenuIllustration({
  newTab,
  install,
  settings,
}: {
  newTab: string;
  install: string;
  settings: string;
}) {
  return (
    <Frame>
      <rect
        x={10}
        y={10}
        width={300}
        height={38}
        rx={12}
        className="fill-surface-2"
      />
      <rect
        x={22}
        y={19}
        width={220}
        height={20}
        rx={10}
        className="fill-surface-3"
      />
      <text x={36} y={33} className="fill-fg-muted">
        {url}
      </text>
      <Highlight cx={284} cy={29} r={13} />
      <g className="fill-fg">
        <circle cx={284} cy={22} r={2} />
        <circle cx={284} cy={29} r={2} />
        <circle cx={284} cy={36} r={2} />
      </g>
      <rect
        x={150}
        y={54}
        width={160}
        height={98}
        rx={12}
        className="fill-surface-2 stroke-border"
      />
      <text x={166} y={77} className="fill-fg-muted">
        {newTab}
      </text>
      <rect
        x={156}
        y={88}
        width={148}
        height={28}
        rx={8}
        className="fill-brand/20 stroke-brand"
        strokeWidth={2}
      />
      <text x={166} y={106} className="fill-fg font-semibold">
        {install}
      </text>
      <text x={166} y={138} className="fill-fg-muted">
        {settings}
      </text>
    </Frame>
  );
}

/** Chrome or Edge on a computer: the install icon in the address bar. */
export function DesktopChromeIllustration({
  prompt,
  install,
}: {
  prompt: string;
  install: string;
}) {
  return (
    <Frame>
      <rect
        x={10}
        y={10}
        width={300}
        height={140}
        rx={12}
        className="fill-surface-2 stroke-border"
      />
      <g className="fill-surface-3">
        <circle cx={26} cy={24} r={4} />
        <circle cx={38} cy={24} r={4} />
        <circle cx={50} cy={24} r={4} />
      </g>
      <rect
        x={20}
        y={38}
        width={280}
        height={26}
        rx={13}
        className="fill-surface-3"
      />
      <text x={36} y={55} className="fill-fg-muted">
        {url}
      </text>
      <Highlight cx={280} cy={51} r={13} />
      <g
        className="stroke-fg"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x={272} y={44} width={16} height={11} rx={2} />
        <path d="M277 59h6M280 47v5M278 50l2 2 2-2" />
      </g>
      <rect
        x={140}
        y={72}
        width={160}
        height={68}
        rx={10}
        className="fill-bg stroke-border"
      />
      <text x={154} y={94} className="fill-fg font-semibold">
        {prompt}
      </text>
      <rect
        x={226}
        y={108}
        width={64}
        height={22}
        rx={11}
        className="fill-brand"
      />
      <text
        x={258}
        y={123}
        textAnchor="middle"
        className="fill-brand-fg font-semibold"
      >
        {install}
      </text>
    </Frame>
  );
}

/** Safari on the Mac: File › Add to Dock. */
export function SafariMacIllustration({
  file,
  addToDock,
}: {
  file: string;
  addToDock: string;
}) {
  return (
    <Frame>
      <rect x={0} y={0} width={320} height={28} className="fill-surface-2" />
      <text x={20} y={18} className="fill-fg font-semibold">
        Safari
      </text>
      <rect
        x={66}
        y={5}
        width={46}
        height={18}
        rx={5}
        className="fill-brand/20"
      />
      <text x={74} y={18} className="fill-fg">
        {file}
      </text>
      <rect
        x={66}
        y={30}
        width={190}
        height={118}
        rx={10}
        className="fill-surface-2 stroke-border"
      />
      <g className="fill-border">
        <rect x={80} y={44} width={110} height={8} rx={4} />
        <rect x={80} y={64} width={80} height={8} rx={4} />
        <rect x={80} y={84} width={130} height={8} rx={4} />
      </g>
      <rect
        x={72}
        y={104}
        width={178}
        height={28}
        rx={8}
        className="fill-brand/20 stroke-brand"
        strokeWidth={2}
      />
      <text x={82} y={122} className="fill-fg font-semibold">
        {addToDock}
      </text>
    </Frame>
  );
}
