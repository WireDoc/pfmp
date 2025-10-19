import React from 'react';

export type LogoVariant =
  | 'p'          // Original stylized P
  | 'pf'         // Monogram P+F suggestion
  | 'coin'       // Circular "coin" badge
  | 'chart'      // Chart motif integrated
  | 'dualtone';  // Two-tone P stroke

export interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {
  variant?: LogoVariant;
  pulse?: boolean;
  size?: number;
}

export function LogoMark({ variant = 'p', pulse = true, size = 28, style, ...svgProps }: LogoMarkProps) {
  const box = 28;
  const commonDefs = (
    <defs>
      <linearGradient id="pfmpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );

  const anim = (
    <style>{`
      @keyframes pfmpPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      .pfmp-pulse { transform-origin: 14px 14px; animation: pfmpPulse 3s ease-in-out infinite; }
    `}</style>
  );

  const Tile = (
    <rect x="0" y="0" width={box} height={box} rx={6} fill="url(#pfmpGrad)" />
  );

  const stemPath = 'M10 6.6 L10 20.4';
  const bowlPath = 'M10 6.6 H17.4 C19.6 6.6 20.6 9.0 20.6 11.4 C20.6 13.8 19.6 16.4 17.2 16.4 H10 Z';

  const PMark = (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d={stemPath} stroke="#ffffff" strokeWidth={2.6} />
  <path d={bowlPath} stroke="#ffffff" strokeWidth={2.6} fill="#ffffff" fillOpacity={0.2} />
    </g>
  );

  const PFMonogram = (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d="M9.2 6.6 L9.2 20.4" stroke="#ffffff" strokeWidth={2.5} />
  <path d="M9.2 6.6 H17 C19.4 6.6 20.6 9.0 20.6 11.2 C20.6 13.4 19.4 15.8 17 15.8 H9.2 Z" stroke="#ffffff" strokeWidth={2.5} fill="#ffffff" fillOpacity={0.18} />
  <path d="M9.2 10.4 H16.4" stroke="#dbeafe" strokeWidth={2.1} />
  <path d="M9.2 13.6 H15.2" stroke="#dbeafe" strokeWidth={2.1} />
    </g>
  );

  const CoinBadge = (
    <g>
      <circle cx={14} cy={14} r={11.2} fill="url(#pfmpGrad)" />
      <circle
        cx={14}
        cy={14}
        r={10.4}
        fill="none"
        stroke="#93c5fd"
        strokeOpacity={0.5}
        strokeWidth={1.4}
      />
      <g filter="url(#softGlow)" transform="translate(1.1 1.0) scale(0.94)">{PMark}</g>
    </g>
  );

  const ChartMotif = (
    <g>
      {Tile}
      {/* Upward bars behind the P */}
      <g opacity={0.35}>
        <rect x={6} y={16} width={2} height={6} fill="#e0f2fe" />
        <rect x={9.5} y={14} width={2} height={8} fill="#bae6fd" />
        <rect x={13} y={12} width={2} height={10} fill="#93c5fd" />
        <rect x={16.5} y={9.5} width={2} height={12.5} fill="#7dd3fc" />
      </g>
      {PMark}
    </g>
  );

  const DualTone = (
    <g>
      {Tile}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d={stemPath} stroke="#ffffff" strokeWidth={2.9} />
  <path d={bowlPath} stroke="#ffffff" strokeWidth={3.2} />
  <path d={bowlPath} stroke="#a5f3fc" strokeWidth={1.7} />
      </g>
    </g>
  );

  let body: React.ReactNode;
  switch (variant) {
    case 'p':
      body = (
        <g>
          {Tile}
          {PMark}
        </g>
      );
      break;
    case 'pf':
      body = (
        <g>
          {Tile}
          {PFMonogram}
        </g>
      );
      break;
    case 'coin':
      body = CoinBadge;
      break;
    case 'chart':
      body = ChartMotif;
      break;
    case 'dualtone':
      body = DualTone;
      break;
    default:
      body = (
        <g>
          {Tile}
          {PMark}
        </g>
      );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      role="img"
      aria-label="PFMP logo"
      style={{ display: 'block', borderRadius: 6, boxShadow: '0 4px 12px rgba(34, 211, 238, 0.3)', ...(style as any) }}
      {...svgProps}
    >
      {anim}
      {commonDefs}
      <g className={pulse ? 'pfmp-pulse' : undefined}>{body}</g>
    </svg>
  );
}

export default LogoMark;
