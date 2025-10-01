import React from 'react';

export type StatusKind = 'Proposed' | 'Accepted' | 'Dismissed' | string;

interface StatusBadgeProps {
  status: StatusKind;
  style?: React.CSSProperties;
  titlePrefix?: string;
}

const colorMap: Record<string, { bg: string; fg: string; border: string; label?: string }> = {
  Proposed: { bg: '#e3f2fd', fg: '#0d47a1', border: '#0d47a1', label: 'PROPOSED' },
  Accepted: { bg: '#e8f5e9', fg: '#1b5e20', border: '#1b5e20', label: 'ACCEPTED' },
  Dismissed: { bg: '#fafafa', fg: '#616161', border: '#bdbdbd', label: 'DISMISSED' }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style, titlePrefix }) => {
  const def = colorMap[status] || { bg: '#eceff1', fg: '#37474f', border: '#37474f', label: String(status).toUpperCase() };
  return (
    <span
      title={(titlePrefix ? titlePrefix + ' ' : '') + status}
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.55rem',
        borderRadius: 999,
        fontSize: '0.65rem',
        fontWeight: 600,
        letterSpacing: 0.5,
        background: def.bg,
        color: def.fg,
        border: '1px solid ' + def.border,
        ...style
      }}
    >{def.label}</span>
  );
};

export default StatusBadge;