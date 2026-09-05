import React from 'react';
import Tooltip from './Tooltip';

interface TitleTooltipProps {
  as?: 'h2' | 'h3';
  tooltip: React.ReactNode;
  children: React.ReactNode;
}

// The heading can ellipsize independently; its tooltip escapes the card
// through the shared body portal and is keyboard/touch accessible.
const TitleTooltip: React.FC<TitleTooltipProps> = ({
  as = 'h3',
  tooltip,
  children,
}) => (
  <Tooltip as={as} className="title-with-tooltip" content={tooltip} rich>
    <span className="title-tooltip-text">{children}</span>
  </Tooltip>
);

export default TitleTooltip;
