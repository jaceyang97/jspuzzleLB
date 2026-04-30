import React, { useState } from 'react';

interface TitleTooltipProps {
  as?: 'h2' | 'h3';
  tooltip: React.ReactNode;
  children: React.ReactNode;
}

const TitleTooltip: React.FC<TitleTooltipProps> = ({
  as: Tag = 'h3',
  tooltip,
  children,
}) => {
  const [show, setShow] = useState(false);
  return (
    <Tag
      style={{ position: 'relative', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && <div className="chart-title-tooltip">{tooltip}</div>}
    </Tag>
  );
};

export default TitleTooltip;
