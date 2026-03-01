import React from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  width: '28px',
  justifyContent: 'center',
  alignItems: 'center',
  lineHeight: '1',
};

const medalStyle: React.CSSProperties = { fontSize: '20px', lineHeight: '1' };

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => (
  <span style={badgeStyle}>
    {rank <= 3 ? <span style={medalStyle}>{MEDALS[rank - 1]}</span> : rank}
  </span>
);

export default RankBadge;
